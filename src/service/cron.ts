export async function scheduleCall(scheduleId: number, hrs: number, min: number, label: string) {
    const cronExpression = `${min} ${label == "pm" ? hrs + 12 : hrs} * * *`
    const resp = await fetch("https://cronho.st/api/v1/schedules", {
        method: "POST",
        headers: {
            "x-api-key": "ch_zdwedxaqAocMaHsDNxSfNcqxBBnAHwSZFDvPiTZAjKwcSDgyXWjpxtHYzNtooYHS",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            "name": "Hourly Health Check",
            "description": "Check if our API is healthy every hour",
            "cronExpression": cronExpression,
            "timezone": "IST",
            "endpoint": "https://pbl4-backend-ten.vercel.app/api/twilio/call",
            "httpMethod": "POST",
            "body": `{"scheduleId": ${scheduleId}}`,
            "maxRetries": 3,
            "timeoutSeconds": 30
        })
    })
    return resp;
}