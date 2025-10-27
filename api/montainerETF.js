import {createClient} from 'redis';

const redis = await createClient({url: 'redis://default:MylebOpXPVqERMbZkqbUaUrVlAcVWPn1@redis-17191.c15.us-east-1-4.ec2.redns.redis-cloud.com:17191'}).connect();

// 监控的ETF列表 (腾讯证券API格式: sh.ETF代码)
const etfList = ["sh513500", "sh513650", "sz159655"];
// 溢价阈值
const premiumThreshold = 0.4;


/**
 * 获取ETF数据 - 使用腾讯证券API
 */
const fetchETFData = async (etfCode) => {
    // 腾讯证券API获取实时行情数据
    const url = `https://qt.gtimg.cn/q=${etfCode}`;

    const response = await fetch(url);

    // 对于腾讯证券API，需要使用GBK编码
    const arrayBuffer = await response.arrayBuffer();
    const decoder = new TextDecoder("gbk"); // 或 'gb2312'
    const data = decoder.decode(arrayBuffer);

    const arr = data
        .split(";")
        .map((item) => item.trim())
        .filter((item) => item.length);

    return arr.map((item) => {
        const values = item.split("~");

        return {
            name: values[1],
            code: values[2],
            premium: Number.parseFloat(values[77]),
        };
    });
};


/**
 * 检查是否有任意两个ETF的溢价差超过阈值
 */
const checkPremiumAlerts = (etfs) => {
    const alerts = [];

    for (let i = 0; i < etfs.length; i++) {
        for (let j = i + 1; j < etfs.length; j++) {
            const difference = Math.abs(etfs[i].premium - etfs[j].premium).toFixed(2);
            if (difference > premiumThreshold) {
                alerts.push({
                    etf1: etfs[i],
                    etf2: etfs[j],
                    difference,
                });
            }
        }
    }

    return alerts;
};


/**
 * 发送提醒通知
 */
const sendAlert = async (alerts) => {
    const message = alerts
        .map(
            ({etf1, etf2, difference}) =>
                `${etf1.name}、${etf2.name}溢价差 ${difference}`,
        )
        .join("\n");
    await sendMessage(message)
};


const sendMessage = async (text) => {
    const url = `https://oapi.dingtalk.com/robot/send?access_token=3b81cf158b90abb5775a13a68ac207a05a7d175a6de54007e74fda0b07c46928`

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "msgtype": "text",
            "text": {"content": `达到${text}`}
        })
    })
    console.log({res})
}


export default async (req, res) => {
    const redisValue = await redis.get('key') || '[]';
    let localData = JSON.parse(redisValue)

    const currentDate = new Date();
    const hour = currentDate.getHours();
    const day = currentDate.getDay();
    if (hour < 9 || hour >= 15 || day === 0 || day === 6) {
        console.log("不在开盘时间");
        return;
    }

    // 获取所有ETF数据
    const etfData = await fetchETFData(etfList.join(","));

    // 检查是否需要提醒
    const alerts = checkPremiumAlerts(etfData);

    if (alerts.length > 0) {
        const isSame =
            alerts.length === localData.length &&
            alerts.every(
                (item, index) =>
                    item.etf1.name === localData[index].etf1.name &&
                    item.etf2.name === localData[index].etf2.name,
            );

        if (isSame) {
            console.log(`ETF组合的溢价差跟上次一样\n`);
            console.log(alerts)
        } else {
            await redis.set('key', JSON.stringify(alerts));

            await sendAlert(alerts);
        }
    } else {
        console.log(`没有ETF组合的溢价差超过${premiumThreshold}%\n`);
    }

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end('ok')
}
