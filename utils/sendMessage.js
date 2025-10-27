const sendMessage = async (text) => {
    const url = `https://oapi.dingtalk.com/robot/send?access_token=3b81cf158b90abb5775a13a68ac207a05a7d175a6de54007e74fda0b07c46928`

    await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "msgtype": "text",
            "text": {"content": `达到${text}`}
        })
    })
}

export default sendMessage
