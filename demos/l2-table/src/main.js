import { Subject } from "rxjs";
import { Point, TableCell, TableData, createTable } from "@dongjiy/l2-table";

const numericColumns = new Set(["price", "change", "volume"]);
const starredSymbols = new Set(["AAPL", "NVDA", "META"]);
const starPath = new Path2D(
  "M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z",
);

function compareNumbers(a, b) {
  const aNumber = Number(a.replace(/[$,%M]/g, ""));
  const bNumber = Number(b.replace(/[$,%M]/g, ""));
  return Math.sign(aNumber - bNumber);
}

function compareText(a, b) {
  return Math.sign(a.localeCompare(b));
}

class MarketTableData extends TableData {
  constructor(columnId) {
    super("—");
    this.compare = numericColumns.has(columnId) ? compareNumbers : compareText;
  }

  toString(value) {
    return value ?? "—";
  }
}

class StarSymbolCell extends TableCell {
  drawGlobal(painter) {
    if (this.style?.backgroundColor) {
      painter.drawRect(this.point, this.dimensions, this.style.backgroundColor);
    }
    if (this.isHovered && this.style?.hovered?.backgroundColor) {
      painter.drawRect(this.point, this.dimensions, this.style.hovered.backgroundColor);
    }
    return 0;
  }

  drawClipped(painter, clippedDimensions, padding) {
    const symbol = this.data?.getDisplayableContent() ?? "";
    const hasStar = starredSymbols.has(symbol);
    const x = this.point.x + padding.left;
    const y = this.point.y + padding.top + clippedDimensions.h / 2;
    const starWidth = hasStar ? 18 : 0;

    const textWidth = painter.writeText(symbol, Point.at(x, y), {
      font: this.style?.text?.font,
      color: this.style?.text?.color,
      baseline: "middle",
      alignment: "left",
    });

    if (hasStar) {
      painter.dangerouslyDrawWithCanvasCtx((ctx) => {
        ctx.save();
        ctx.translate(x + textWidth + 6, y - 6);
        ctx.scale(0.5, 0.5);
        ctx.fillStyle = "#d29618";
        ctx.fill(starPath);
        ctx.restore();
      });
    }

    return starWidth + textWidth;
  }
}

const instruments = [
  ["AAPL", "Apple", "$227.65", "+1.24%", "61.2M"],
  ["MSFT", "Microsoft", "$416.19", "+0.68%", "18.4M"],
  ["NVDA", "NVIDIA", "$132.29", "+2.91%", "205.6M"],
  ["AMZN", "Amazon", "$186.73", "-0.34%", "33.8M"],
  ["META", "Meta", "$514.01", "+0.92%", "12.7M"],
  ["GOOGL", "Alphabet", "$166.53", "+0.41%", "20.1M"],
  ["TSLA", "Tesla", "$248.98", "-1.12%", "96.4M"],
  ["AVGO", "Broadcom", "$160.44", "+1.78%", "28.3M"],
  ["JPM", "JPMorgan", "$202.31", "+0.36%", "8.9M"],
  ["V", "Visa", "$278.54", "-0.18%", "5.6M"],
  ["WMT", "Walmart", "$67.18", "+0.45%", "11.3M"],
  ["LLY", "Eli Lilly", "$805.22", "+1.09%", "4.1M"],
  ["ORCL", "Oracle", "$141.72", "-0.56%", "9.7M"],
  ["NFLX", "Netflix", "$671.44", "+0.84%", "3.2M"],
  ["COST", "Costco", "$882.17", "+0.29%", "2.0M"],
  ["AMD", "AMD", "$156.93", "+2.18%", "54.7M"],
  ["INTC", "Intel", "$31.46", "-0.71%", "42.6M"],
  ["CRM", "Salesforce", "$273.09", "+0.62%", "6.4M"],
  ["ADBE", "Adobe", "$521.62", "-0.23%", "2.8M"],
  ["QCOM", "Qualcomm", "$173.81", "+1.31%", "7.6M"],
  ["DIS", "Disney", "$109.04", "+0.14%", "10.2M"],
  ["BA", "Boeing", "$176.55", "-1.48%", "5.1M"],
  ["UBER", "Uber", "$76.28", "+0.96%", "18.6M"],
  ["SHOP", "Shopify", "$73.61", "+1.65%", "9.4M"],
];

const columns = [
  ["symbol", "Symbol", 112, 190],
  ["company", "Company", 180, 320],
  ["price", "Last price", 130, 220],
  ["change", "Change", 130, 220],
  ["volume", "Volume", 130, 220],
].map(([columnId, name, minWidth, maxWidth]) => ({
  columnId,
  name,
  minWidth,
  maxWidth,
  autoResize: false,
  placeholderAccessorFn: (row) => row.placeholders[columnId],
  cellData: () => new MarketTableData(columnId),
  renderCell: columnId === "symbol" ? (style) => new StarSymbolCell(style) : undefined,
}));

const rows = instruments.map(([symbol, company]) => ({
  rowId: symbol,
  placeholders: { symbol, company, price: "—", change: "—", volume: "—" },
}));

const updates = new Subject();
const table = createTable(document.querySelector("#table-root"), {
  config: {
    columns,
    rows,
    style: {
      body: {
        row: { height: 44 },
        cell: {
          padding: { left: 14, right: 14 },
          text: { font: "14px ui-monospace, SFMono-Regular, Menlo, monospace", color: "#19212d" },
          hovered: { backgroundColor: "#eef4ff" },
        },
      },
      header: {
        row: { height: 46 },
        cell: {
          padding: { left: 14, right: 14 },
          text: { font: "600 12px ui-sans-serif, system-ui, sans-serif", color: "#45607d" },
          backgroundColor: "#f6f9fd",
        },
        resizer: { width: 2, color: "#aab8ca" },
      },
    },
  },
  source: updates,
});

function publishRows() {
  for (const [symbol, company, price, change, volume] of instruments) {
    const drift = (Math.random() - 0.48) * 0.75;
    const nextPrice = Number(price.replace("$", "")) * (1 + drift / 100);
    const nextChange = Number(change.replace(/[+%]/g, "")) + drift;
    const nextVolume = Number(volume.replace("M", "")) * (0.98 + Math.random() * 0.05);

    [
      ["symbol", symbol],
      ["company", company],
      ["price", `$${nextPrice.toFixed(2)}`],
      ["change", `${nextChange >= 0 ? "+" : ""}${nextChange.toFixed(2)}%`],
      ["volume", `${nextVolume.toFixed(1)}M`],
    ].forEach(([columnId, data]) => updates.next({ rowId: symbol, columnId, data }));
  }
}

const intervalId = window.setInterval(publishRows, 900);
window.addEventListener("beforeunload", () => {
  window.clearInterval(intervalId);
  table.close();
});

publishRows();
