import sendMessage from '../utils/sendMessage.js'
import fetchETFData from '../utils/fetchETFData.js'

// 监控的ETF列表 (腾讯证券API格式: sh.ETF代码)
const etfList = ["sh512890", "usSPY", "sh518880"];
// 回测阈值，百分位数
const threshold = 6;


export default async (req, res) => {
    // 获取所有ETF数据
    const etfData = await fetchETFData(etfList);
    const backs = etfData.filter(item => item.back > threshold)

    if (backs.length) {
        const message = backs
            .map(
                ({name, back}) =>
                    `${name}回测 ${back}%`,
            )
            .join("\n");
        await sendMessage(message)
    }

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end('ok')
}
