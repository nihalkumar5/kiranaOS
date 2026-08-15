const fs = require('fs');
let content = fs.readFileSync('src/app/api/reports/sales-aggregate/route.ts', 'utf8');

const replacement = `
    const paymentMap: Record<string, number> = {};
    const timelineMap: Record<string, { sales: number; bills: number }> = {};

    // Pre-fill timelineMap with all dates in range
    let currDate = new Date(startDate);
    while (currDate <= endDate) {
      const dateStr = currDate.toISOString().split('T')[0];
      timelineMap[dateStr] = { sales: 0, bills: 0 };
      currDate.setDate(currDate.getDate() + 1);
    }

    for (const order of orders) {
`;

content = content.replace("    const paymentMap: Record<string, number> = {};\n    const timelineMap: Record<string, { sales: number; bills: number }> = {};\n\n    for (const order of orders) {", replacement);

fs.writeFileSync('src/app/api/reports/sales-aggregate/route.ts', content);
console.log("Graph fixed");
