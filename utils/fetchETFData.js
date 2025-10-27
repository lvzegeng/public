/**
 * 获取ETF数据 - 使用腾讯证券API
 */
const fetchETFData = async (etfList) => {
    const etfCode = etfList.join(",")
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

        const currentPrice = Number.parseFloat(values[3])
        const max52week = Number.parseFloat(values[67])

        return {
            name: values[1],
            code: values[2],
            // 溢价值
            premium: Number.parseFloat(values[77]),
            // 当前价格
            currentPrice,
            // 52周最高价格
            max52week,
            // 回撤
            back: ((1 - (currentPrice / max52week)) * 100).toFixed(2)
        };
    });
};


export default fetchETFData
