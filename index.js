const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const url = require('url');

const baseUrl = 'http://www.nxjinxiang.com/'; // 目标网站的基础 URL
const visited = new Set(); // 记录访问过的页面
const mediaLinks = new Set(); // 记录找到的媒体资源链接
const downloadDir = 'downloads'; // 媒体资源下载目录

// 创建下载目录
if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir);
}

async function crawlPage(pageUrl) {
    if (visited.has(pageUrl)) return; // 如果页面已访问过，则返回
    visited.add(pageUrl);

    try {
        const { data } = await axios.get(pageUrl);
        const $ = cheerio.load(data);

        // 提取媒体资源链接
        $('img, video, audio, source').each((index, element) => {
            const mediaUrl = $(element).attr('src') || $(element).attr('data-src');
            if (mediaUrl) {
                const fullUrl = url.resolve(pageUrl, mediaUrl);
                mediaLinks.add(fullUrl);
            }
        });

        // 提取背景图片链接
        $('[style*="background-image"]').each((index, element) => {
            console.log('====================11111111111111111111111')
            const style = $(element).attr('style');
            const backgroundImageUrlMatch = /url\(["']?([^"')]+)["']?\)/.exec(style);
            if (backgroundImageUrlMatch) {
                const backgroundImageUrl = backgroundImageUrlMatch[1];
                const fullUrl = url.resolve(pageUrl, backgroundImageUrl);
                mediaLinks.add(fullUrl);
            }
        });

        // 提取页面中的其他链接
        $('a').each((index, element) => {
            const link = $(element).attr('href');
            if (link) {
                const fullLink = url.resolve(pageUrl, link);
                if (fullLink.startsWith(baseUrl) && !visited.has(fullLink)) {
                    crawlPage(fullLink); // 递归爬取
                }
            }
        });
    } catch (error) {
        console.error(`Error crawling ${pageUrl}:`, error);
    }
}

async function downloadMedia() {
    for (const link of mediaLinks) {
        const mediaPath = path.join(downloadDir, path.basename(url.parse(link).pathname));
        try {
            const response = await axios.get(link, { responseType: 'stream' });
            const writer = fs.createWriteStream(mediaPath);
            response.data.pipe(writer);

            // 等待文件写入完成
            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            console.log(`Downloaded: ${link}`);
        } catch (error) {
            console.error(`Error downloading ${link}:`, error);
        }
    }
}

async function main() {
    await crawlPage(baseUrl);
    await downloadMedia();
}

main();
