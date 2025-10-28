import {createClient} from 'redis';
import sendMessage from '../utils/sendMessage.js'
import fetchETFData from '../utils/fetchETFData.js'

// 监控的ETF列表 (腾讯证券API格式: sh.ETF代码)
const etfList = ["sh513500", "sh513650", "sz159655"];
// 溢价阈值
const premiumThreshold = 0.4;


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


export default async (req, res) => {
    const redis = await createClient({url: 'redis://default:MylebOpXPVqERMbZkqbUaUrVlAcVWPn1@redis-17191.c15.us-east-1-4.ec2.redns.redis-cloud.com:17191'}).connect();

    const redisValue = await redis.get('key') || '[]';
    let localData = JSON.parse(redisValue)

    // 获取所有ETF数据
    const etfData = await fetchETFData(etfList);

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

            const message = alerts
                .map(
                    ({etf1, etf2, difference}) =>{
                        let maxEtf = etf1
                        let minEtf = etf2
                        if(etf1.premium < etf2.premium){
                            maxEtf = etf2
                            minEtf = etf1
                        }
                        return `${maxEtf.name} - ${minEtf.name} 的溢价差为 ${maxEtf.premium}-${minEtf.premium}=${difference}`
                    }

                )
                .join("\n");
            await sendMessage(message)
        }
    } else {
        console.log(`没有ETF组合的溢价差超过${premiumThreshold}%\n`);
    }

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end('ok')
}
