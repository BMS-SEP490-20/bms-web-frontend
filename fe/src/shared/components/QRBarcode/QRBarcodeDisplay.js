import React from 'react';
import { Row, Col } from 'react-bootstrap';
import QRCodeDisplay from './QRCodeDisplay';
import BarcodeDisplay from './BarcodeDisplay';

const QRBarcodeDisplay = ({ 
  qrValue, 
  barcodeValue,
  qrTitle = 'QR Code',
  barcodeTitle = 'Barcode',
  qrSize = 150,
  barcodeHeight = 50,
  showActions = false,
  className = ''
}) => {
  return (
    <div className={`qr-barcode-container ${className}`}>
      <Row className="g-3">
        {qrValue && (
          <Col md={barcodeValue ? 6 : 12}>
            <QRCodeDisplay
              value={qrValue}
              size={qrSize}
              title={qrTitle}
              showActions={showActions}
            />
          </Col>
        )}
        {barcodeValue && (
          <Col md={qrValue ? 6 : 12}>
            <BarcodeDisplay
              value={barcodeValue}
              height={barcodeHeight}
              title={barcodeTitle}
              showActions={showActions}
            />
          </Col>
        )}
      </Row>
    </div>
  );
};

export default QRBarcodeDisplay;
