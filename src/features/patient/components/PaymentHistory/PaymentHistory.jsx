/**
 * @file PaymentHistory.jsx
 * @description Patient billing and invoice history module (UC18).
 * Displays electronic payment receipts, status, transaction IDs, and downloadable receipt statements.
 * Conforms to: Production Engineering Standards & AGENTS-DESIGN.md.
 */

import React, { useState } from 'react';
import { Card, Table, Badge, Button, Form } from 'react-bootstrap';
import { 
  FaCreditCard, 
  FaReceipt, 
  FaCheckCircle, 
  FaClock, 
  FaFileInvoiceDollar, 
  FaDownload 
} from 'react-icons/fa';

export default function PaymentHistory() {
  const [filterStatus, setFilterStatus] = useState('ALL');

  const payments = [
    {
      invoiceNo: 'INV-2026-8801',
      date: '2026-10-18 14:35',
      packageName: 'Gói xét nghiệm Chức năng Gan & Thận chuyên sâu',
      amount: '650.000 đ',
      method: 'VNPay QR',
      status: 'PAID'
    },
    {
      invoiceNo: 'INV-2026-8795',
      date: '2026-10-10 09:15',
      packageName: 'Tổng phân tích tế bào máu ngoại vi (CBC)',
      amount: '180.000 đ',
      method: 'Chuyển Khoản Ngân Hàng',
      status: 'PAID'
    },
    {
      invoiceNo: 'INV-2026-8710',
      date: '2026-09-25 10:20',
      packageName: 'Định lượng Bộ Mỡ Máu Lipid (4 chỉ số)',
      amount: '220.000 đ',
      method: 'Tiền Mặt Tại Quầy',
      status: 'PAID'
    }
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return <Badge bg="success" className="px-2 py-1"><FaCheckCircle className="me-1" />Đã Thanh Toán</Badge>;
      case 'PENDING':
        return <Badge bg="warning" text="dark" className="px-2 py-1"><FaClock className="me-1" />Chờ Thanh Toán</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const filtered = payments.filter(p => {
    if (filterStatus === 'ALL') return true;
    return p.status === filterStatus;
  });

  return (
    <Card className="border-0 shadow-sm rounded-4 overflow-hidden mb-4">
      <Card.Header className="bg-white py-3 px-4 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div className="d-flex align-items-center gap-3">
          <div className="rounded-3 p-2 bg-success bg-opacity-10 text-success">
            <FaFileInvoiceDollar size={22} />
          </div>
          <div>
            <h5 className="fw-bold mb-0 text-dark">Lịch Sử Giao Dịch & Hóa Đơn Điện Tử</h5>
            <small className="text-muted">Tra cứu biên lai viện phí và hóa đơn thanh toán xét nghiệm trực tuyến</small>
          </div>
        </div>
        <div>
          <Form.Select 
            size="sm" 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ width: 170 }}
          >
            <option value="ALL">Tất cả giao dịch</option>
            <option value="PAID">Đã thanh toán</option>
            <option value="PENDING">Chờ thanh toán</option>
          </Form.Select>
        </div>
      </Card.Header>

      <Card.Body className="p-0">
        <div className="table-responsive">
          <Table hover className="align-middle mb-0 text-nowrap">
            <thead className="table-light text-muted small text-uppercase">
              <tr>
                <th className="ps-4">Số Hóa Đơn</th>
                <th>Thời Gian Giao Dịch</th>
                <th>Khoản Mục / Gói Dịch Vụ</th>
                <th>Phương Thức</th>
                <th>Số Tiền</th>
                <th>Trạng Thái</th>
                <th className="text-end pe-4">Biên Lai</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.invoiceNo}>
                  <td className="ps-4 fw-semibold text-primary">{p.invoiceNo}</td>
                  <td className="text-muted small">{p.date}</td>
                  <td className="fw-medium text-dark">{p.packageName}</td>
                  <td>
                    <Badge bg="light" text="dark" className="border">
                      <FaCreditCard className="me-1 text-primary" />{p.method}
                    </Badge>
                  </td>
                  <td className="fw-bold text-success">{p.amount}</td>
                  <td>{getStatusBadge(p.status)}</td>
                  <td className="text-end pe-4">
                    <Button variant="outline-primary" size="sm" className="px-2 py-1">
                      <FaDownload className="me-1" /> Tải HĐ (PDF)
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card.Body>
    </Card>
  );
}
