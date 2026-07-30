import { QRCodeSVG } from 'qrcode.react';
import { getEntityId } from '@/src/utils/entityId';

// A print-only sheet of tool QR labels. It lives off-screen while on screen and,
// when the browser prints, a scoped @media print block hides everything else and
// lays the labels out in a grid — so "Print QR codes" (or a single "Print label")
// produces clean stickers / a PDF without the surrounding admin chrome.
export default function ToolQrPrintSheet({ tools = [] }) {
  const printable = tools.filter((tool) => tool?.qrId);

  if (!printable.length) {
    return null;
  }

  return (
    <div className="qr-print-sheet" aria-hidden="true">
      <style>{`
        @media screen {
          .qr-print-sheet { position: fixed; left: -100vw; top: 0; width: 0; height: 0; overflow: hidden; }
        }
        @media print {
          @page { margin: 12mm; }
          body * { visibility: hidden !important; }
          .qr-print-sheet, .qr-print-sheet * { visibility: visible !important; }
          .qr-print-sheet {
            position: absolute !important;
            left: 0 !important; top: 0 !important;
            width: 100%;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8mm;
          }
          .qr-print-cell {
            break-inside: avoid;
            text-align: center;
            border: 1px solid #d0d0d0;
            border-radius: 8px;
            padding: 6mm 4mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 3mm;
          }
          .qr-print-name { font-weight: 700; font-size: 12pt; }
          .qr-print-code { font-family: monospace; font-size: 10pt; color: #333; }
        }
      `}</style>
      {printable.map((tool) => (
        <div className="qr-print-cell" key={getEntityId(tool)}>
          <QRCodeSVG value={tool.qrId} size={150} includeMargin />
          <div className="qr-print-name">{tool.name}</div>
          <div className="qr-print-code">{tool.qrId}</div>
        </div>
      ))}
    </div>
  );
}
