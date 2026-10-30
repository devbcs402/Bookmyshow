import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export function TicketQR({ qrPayload, size = 160 }) {
  if (!qrPayload) return null;

  return (
    <div className="flex flex-col items-center justify-center p-3.5 bg-white rounded-xl shadow-md">
      <QRCodeSVG
        value={qrPayload}
        size={size}
        level="M"
        includeMargin={false}
      />
      <span className="text-[10px] font-bold tracking-wider text-slate-800 uppercase mt-2">
        Scan at Cinema Turnstile
      </span>
    </div>
  );
}

export default TicketQR;

