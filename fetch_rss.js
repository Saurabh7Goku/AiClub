const Parser = require('rss-parser');
const parser = new Parser();

const FEEDS = [
    {
        name: 'TechCrunch AI',
        url: 'https://techcrunch.com/category/artificial-intelligence/feed/',
        category: 'Research'
    },
    {
        name: 'Google AI Blog',
        url: 'https://blog.google/technology/ai/rss/',
        category: 'LLM'
    },
    {
        name: 'Nvidia Deep Learning',
        url: 'https://blogs.nvidia.com/blog/category/deep-learning/feed/',
        category: 'Infra'
    },
    {
        name: 'MIT AI Review',
        url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed/',
        category: 'Research'
    }
];

async function getLatestNews() {
    console.log('Fetching latest intelligence signals from RSS feeds...');
    const allNewItems = [];

    for (const feed of FEEDS) {
        try {
            const feedData = await parser.parseURL(feed.url);

            for (const item of feedData.items.slice(0, 5)) { // limit to 5 per feed to avoid huge log
                if (!item.link) continue;

                const newItem = {
                    title: item.title || 'Untitled Signal',
                    sourceUrl: item.link,
                    sourceName: feed.name,
                };

                allNewItems.push(newItem);
            }
        } catch (error) {
            console.error(`Error fetching feed ${feed.name}:`, error.message);
        }
    }

    console.log(JSON.stringify(allNewItems, null, 2));
}

getLatestNews().catch(console.error);
