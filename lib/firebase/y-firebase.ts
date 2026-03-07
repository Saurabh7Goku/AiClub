import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import {
  Firestore,
  collection,
  doc,
  onSnapshot,
  setDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';

/**
 * A simple Firebase Provider for Yjs.
 * Syncs a Y.Doc to a Firestore subcollection of updates.
 */
export class FirebaseProvider {
  private db: Firestore;
  private roomName: string;
  private ydoc: Y.Doc;
  public awareness: awarenessProtocol.Awareness;

  private unsubUpdates: (() => void) | null = null;
  private unsubAwareness: (() => void) | null = null;
  private clientId: number;
  private updateHandler: (update: Uint8Array, origin: any) => void;
  private awarenessHandler: (changes: any, origin: any) => void;

  constructor(db: Firestore, roomName: string, ydoc: Y.Doc) {
    this.db = db;
    this.roomName = roomName;
    this.ydoc = ydoc;
    this.clientId = ydoc.clientID;
    this.awareness = new awarenessProtocol.Awareness(ydoc);

    // 1. Listen for local Yjs changes and push to Firebase
    this.updateHandler = (update: Uint8Array, origin: any) => {
      // Don't echo updates that originated from Firebase itself
      if (origin === this) return;
      this.pushUpdate(update);
    };
    this.ydoc.on('update', this.updateHandler);

    // 2. Listen for local awareness changes and push to Firebase
    this.awarenessHandler = ({ added, updated, removed }: any, origin: any) => {
      if (origin === this) return;
      
      const changedClients = added.concat(updated, removed);
      // Only push state for *our* client ID
      if (changedClients.includes(this.clientId)) {
        this.pushAwareness();
      }
    };
    this.awareness.on('change', this.awarenessHandler);

    // 3. Connect to Firebase
    this.connect();
  }

  private connect() {
    // A) Subscribe to document updates
    const updatesRef = collection(this.db, this.roomName, 'yjs_updates');
    const qUpdates = query(updatesRef, orderBy('timestamp', 'asc'));

    this.unsubUpdates = onSnapshot(qUpdates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          // Skip our own updates if we somehow receive them
          if (data.clientId === this.clientId) return;

          try {
            // Convert base64 string back to Uint8Array
            const updateStr = data.update;
            const update = new Uint8Array(Buffer.from(updateStr, 'base64'));
            Y.applyUpdate(this.ydoc, update, this);
          } catch (e) {
            console.error('[FirebaseProvider] Error applying update:', e);
          }
        }
      });
    });

    // B) Subscribe to awareness updates (cursors/presence)
    const awarenessRef = collection(this.db, this.roomName, 'yjs_awareness');
    this.unsubAwareness = onSnapshot(awarenessRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        const clientID = Number(change.doc.id);

        if (clientID === this.clientId) return; // Skip our own

        if (change.type === 'removed') {
          awarenessProtocol.removeAwarenessStates(this.awareness, [clientID], this);
        } else {
          // It's an added or modified state
          let state;
          try {
            state = JSON.parse(data.state);
          } catch (e) { return; }

          // We construct an update message for the awareness protocol manually
          // The protocol expects: [numClients, clientID, clock, stateStringLength, stateString]
          // But it's easier to just set the state in our local map directly:
          
          // @ts-ignore - reaching into internal map to bypass the byte-parsing logic
          const clientMeta = this.awareness.meta.get(clientID) || { clock: 0 };
          const clock = data.clock || (clientMeta.clock + 1);
          
          // @ts-ignore
          this.awareness.meta.set(clientID, { clock, lastUpdated: Date.now() });
          
          // @ts-ignore
          this.awareness.states.set(clientID, state);
          
          this.awareness.emit('change', [{
             added: change.type === 'added' ? [clientID] : [],
             updated: change.type === 'modified' ? [clientID] : [],
             removed: []
          }, this]);
        }
      });
    });

    // C) Periodic awareness ping (keepalive)
    setInterval(() => {
      // Touch our awareness doc to keep it fresh
      if (this.awareness.getLocalState()) {
         this.pushAwareness();
      }
    }, 15000);
  }

  private async pushUpdate(update: Uint8Array) {
    try {
      const updatesRef = collection(this.db, this.roomName, 'yjs_updates');
      const updateDoc = doc(updatesRef); // auto-id
      
      // Convert Uint8Array to base64 string for Firestore
      const base64Update = Buffer.from(update).toString('base64');

      await setDoc(updateDoc, {
        update: base64Update,
        clientId: this.clientId,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.error('[FirebaseProvider] Failed to push update:', e);
    }
  }

  private async pushAwareness() {
    try {
      const state = this.awareness.getLocalState();
      const meta = this.awareness.meta.get(this.clientId);
      const clock = meta ? meta.clock : 0;
      
      const updatesRef = collection(this.db, this.roomName, 'yjs_awareness');
      const docRef = doc(updatesRef, String(this.clientId));
      
      if (state) {
        await setDoc(docRef, {
          state: JSON.stringify(state),
          clock: clock,
          timestamp: serverTimestamp()
        });
      } else {
        await deleteDoc(docRef);
      }
    } catch (e) {
       console.error('[FirebaseProvider] Failed to push awareness:', e);
    }
  }

  public destroy() {
    this.ydoc.off('update', this.updateHandler);
    this.awareness.off('change', this.awarenessHandler);
    
    if (this.unsubUpdates) this.unsubUpdates();
    if (this.unsubAwareness) this.unsubAwareness();
    
    // Attempt to remove our awareness state
    try {
       const updatesRef = collection(this.db, this.roomName, 'yjs_awareness');
       const docRef = doc(updatesRef, String(this.clientId));
       deleteDoc(docRef).catch(() => {});
    } catch (e) {}
  }
}
