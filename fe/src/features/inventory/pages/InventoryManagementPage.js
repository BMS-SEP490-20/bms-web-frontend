/**
 * Inventory Management Component
 * 
 * Inventory management component for the Blood Laboratory Management System.
 * Provides comprehensive inventory control including stock tracking,
 * item management, and low stock alerts.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Modal, Form } from 'react-bootstrap';
import { useNotificationContext } from '../../../shared/contexts/NotificationContext';
import warehouseService from '../../../services/warehouseService';
import ConfirmDialog from '../../../shared/components/ConfirmDialog/ConfirmDialog';
import useResponsive from '../../../shared/hooks/useResponsive';

/**
 * Normalizes incoming date strings to YYYY-MM-DD format for date input
 * 
 * This helper function converts various date formats to YYYY-MM-DD format
 * required by HTML5 date input fields.
 * 
 * **Supported formats:**
 * - ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
 * - Vietnamese format: DD/MM/YYYY or DD-MM-YYYY
 * - Date objects
 * 
 * @param {string|Date|number} raw - Date string, Date object, or timestamp
 * @returns {string} Date string in YYYY-MM-DD format or empty string
 * 
 * @example
 * // Format date for input
 * const formatted = formatForDateInput('01/12/2024');
 * // Returns: '2024-12-01'
 */
// Helper: normalize incoming date strings to YYYY-MM-DD for <input type="date" />
const formatForDateInput = (raw) => {
  if (!raw && raw !== 0) return '';
  try {
    let s = String(raw).trim();
    if (!s) return '';
    // If already in ISO yyyy-mm-dd or ISO datetime
    const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    // If dd/mm/yyyy or dd-mm-yyyy
    const dm = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dm) {
      const dd = dm[1].padStart(2, '0');
      const mm = dm[2].padStart(2, '0');
      const yyyy = dm[3];
      return `${yyyy}-${mm}-${dd}`;
    }
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0,10);
  } catch (e) {}
  return '';
};

/**
 * Normalizes unit names from English to Vietnamese for display
 * 
 * This helper function converts English unit names to Vietnamese equivalents
 * for consistent display in the UI. It handles both singular and plural forms.
 * 
   * **Unit mappings:**
   * - bottle/bottles → Chai
   * - box/boxes → Hộp
   * - bag/bags → Túi
   * - tube/tubes → Ống
   * - vial/vials → Lọ
   * - And many more...
   * 
   * @param {string} unit - Unit name in English or Vietnamese
   * @returns {string} Normalized unit name in Vietnamese
   * 
   * @example
   * // Normalize unit for display
   * const normalized = normalizeUnit('bottle');
   * // Returns: 'Chai'
   */
// Helper: normalize unit from English to Vietnamese for display
const normalizeUnit = (unit) => {
  if (!unit) return '-';
  const unitLower = String(unit).trim().toLowerCase();
  
  const unitMap = {
    // English to Vietnamese
    'bottle': 'Chai',
    'bottles': 'Chai',
    'box': 'Hộp',
    'boxes': 'Hộp',
    'bag': 'Túi',
    'bags': 'Túi',
    'tube': 'Ống',
    'tubes': 'Ống',
    'vial': 'Lọ',
    'vials': 'Lọ',
    'pack': 'Gói',
    'packs': 'Gói',
    'piece': 'Cái',
    'pieces': 'Cái',
    'set': 'Bộ',
    'sets': 'Bộ',
    'roll': 'Cuộn',
    'rolls': 'Cuộn',
    'sheet': 'Tờ',
    'sheets': 'Tờ',
    'strip': 'Que',
    'strips': 'Que',
    'cartridge': 'Hộp mực',
    'cartridges': 'Hộp mực',
    'container': 'Thùng',
    'containers': 'Thùng',
    'can': 'Lon',
    'cans': 'Lon',
    'jar': 'Hũ',
    'jars': 'Hũ',
    // Vietnamese to Vietnamese (normalize case)
    'chai': 'Chai',
    'hộp': 'Hộp',
    'túi': 'Túi',
    'ống': 'Ống',
    'lọ': 'Lọ',
    'gói': 'Gói',
    'cái': 'Cái',
    'bộ': 'Bộ',
    'cuộn': 'Cuộn',
    'tờ': 'Tờ',
    'que': 'Que',
    'thùng': 'Thùng',
    'lon': 'Lon',
    'hũ': 'Hũ'
  };
  
  // Check exact match first
  if (unitMap[unitLower]) {
    return unitMap[unitLower];
  }
  
  // If not found in map, return original with first letter capitalized
  return String(unit).charAt(0).toUpperCase() + String(unit).slice(1).toLowerCase();
};

// Helper: convert Vietnamese unit back to English for form value
const getUnitFormValue = (unit) => {
  if (!unit) return '';
  const unitLower = String(unit).trim().toLowerCase();
  
  // Map Vietnamese to English for form dropdown
  const reverseMap = {
    'chai': 'bottle',
    'hộp': 'box',
    'túi': 'bag',
    'ống': 'tube',
    'lọ': 'vial',
    'gói': 'pack',
    'cái': 'piece',
    'bộ': 'set',
    'cuộn': 'roll',
    'tờ': 'sheet',
    'que': 'strip',
    'thùng': 'container',
    'lon': 'can',
    'hũ': 'jar'
  };
  
  // If it's already in English, return as is
  const englishUnits = ['bottle', 'box', 'bag', 'tube', 'vial', 'pack', 'piece', 'set', 'roll', 'sheet', 'strip', 'cartridge', 'container', 'can', 'jar'];
  if (englishUnits.includes(unitLower)) {
    return unitLower;
  }
  
  // If it's Vietnamese, convert to English
  if (reverseMap[unitLower]) {
    return reverseMap[unitLower];
  }
  
  // If not found, return original (might be custom unit)
  return unit;
};

/**
 * Inventory Management Component
 * 
 * Manages laboratory inventory with full CRUD operations and stock tracking.
 * Provides low stock alerts and comprehensive inventory management.
 * 
 * @returns {React.ReactNode} Inventory management component
 */
const InventoryManagement = () => {
  const { showSuccess, showError } = useNotificationContext();
  const { isMobile, isTablet } = useResponsive();
  const [inventory, setInventory] = useState([]);
  const [mode, setMode] = useState('reagent'); // 'reagent' or 'equipment'
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Confirm dialog states
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    quantity: '',
    unit: '',
    minQuantity: '',
    supplier: '',
    expiryDate: '',
    importDate: '',
    importLot: '',
    lastMaintenanceDate: '',
    description: '',
    status: '',
  });

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true);
      // load reagents or equipment based on mode
      // Request full lists when supported by backend (fetchAll -> warehouseService will page through)
      const result = mode === 'equipment'
        ? await warehouseService.getAllEquipment({ fetchAll: true })
        : await warehouseService.getAllReagents({ fetchAll: true });
      if (result.success) {
        setInventory(result.data || []);
      }
    } catch (error) {
      showError('Lỗi khi tải dữ liệu kho');
    } finally {
      setLoading(false);
    }
  }, [mode, showError]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);


  const handleCreate = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      code: '',
      quantity: '',
      unit: '',
      minQuantity: '',
      supplier: '',
      expiryDate: '',
      importDate: '',
      importLot: '',
      lastMaintenanceDate: '',
      description: '',
      status: '',
    });
    setShowModal(true);
  };

  const handleViewDetail = (item) => {
    setDetailItem(item);
    setShowDetailModal(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      // Common fields
      name: item.name || item.raw?.name || item.raw?.reagent_name || '',
      code: item.code || item.raw?.code || item.raw?.reagent_code || '',
      quantity: item.quantity ?? item.raw?.quantity ?? '',
      unit: getUnitFormValue(item.unit || item.raw?.unit || ''),
      supplier: item.manufacturer || item.raw?.supplier || item.raw?.manufacturer || '',
      // Type-specific fallbacks
      minQuantity: item.raw?.minQuantity ?? '',
      // price removed from UI
      expiryDate: formatForDateInput(item.expiryDate || item.raw?.expiryDate || item.raw?.expiry_date || ''),
      importDate: formatForDateInput(item.importDate || item.raw?.importDate || item.raw?.import_date || ''),
      importLot: item.importLot || item.raw?.importLot || item.raw?.import_lot || '',
      lastMaintenanceDate: formatForDateInput(item.lastMaintenanceDate || item.raw?.last_maintenance_date || item.expiryDate || ''),
      description: item.description || item.raw?.description || '',
      status: item.status || item.raw?.status || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let result;
      if (mode === 'equipment') {
        const equipmentPayload = {
          name: formData.name,
          code: formData.code || undefined,
          quantity: formData.quantity ? Number(formData.quantity) : 0,
          unit: formData.unit,
          manufacturer: formData.supplier,
          lastMaintenanceDate: formData.lastMaintenanceDate || undefined,
          description: formData.description || undefined,
          status: formData.status || undefined,
          // notes removed
        };
        result = editingItem
          ? await warehouseService.updateEquipment(editingItem.id, equipmentPayload)
          : await warehouseService.createEquipment(equipmentPayload);
      } else {
        const reagentPayload = {
          reagentName: formData.name,
          reagentCode: formData.code || undefined,
          quantity: formData.quantity ? Number(formData.quantity) : 0,
          unit: formData.unit || undefined,
          expiryDate: formData.expiryDate || undefined,
          importDate: formData.importDate || undefined,
          importLot: formData.importLot || undefined,
          manufacturer: formData.supplier || undefined,
          description: formData.description || undefined,
          minQuantity: formData.minQuantity ? Number(formData.minQuantity) : undefined,
          status: formData.status || undefined
        };
        result = editingItem
          ? await warehouseService.updateReagent(editingItem.id, reagentPayload)
          : await warehouseService.createReagent(reagentPayload);
      }

      if (result.success) {
        showSuccess(editingItem ? 'Cập nhật thành công' : 'Tạo mới thành công');
        setShowModal(false);
        loadInventory();
      } else {
        showError(result.message);
      }
    } catch (error) {
      showError('Lỗi xử lý dữ liệu');
    }
  };

  const handleDelete = (id) => {
    setItemToDelete(id);
    setShowConfirmDialog(true);
  };

  // --- Import handlers ---
  const parseTextToRows = (text) => {
    // detect delimiter: tab or comma
    const delim = text.includes('\t') ? '\t' : ',';
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];
    const headers = lines[0].split(delim).map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const cols = line.split(delim).map(c => c.trim());
      const obj = {};
      headers.forEach((h, i) => { obj[h] = cols[i] ?? ''; });
      return obj;
    });
    return rows;
  };

  const mapRowToReagentPayload = (row) => ({
    name: row.reagent_name || row.name || row['ReagentName'] || '',
    code: row.reagent_code || row.code || row['ReagentCode'] || undefined,
    manufacturer: row.manufacturer || row.Manufacturer || undefined,
    quantity: row.quantity ? Number(row.quantity) : 0,
    unit: row.unit || row.Unit || undefined,
    expiryDate: row.expiry_date || row.expiryDate || row['expiry-date'] || undefined,
    // notes/import description removed
    importLot: row.import_lot || row.importLot || undefined
  });

  const mapRowToEquipmentPayload = (row) => ({
    name: row.equipment_name || row.name || row['EquipmentName'] || '',
    code: row.code_manufacturer || row.code || row.equipment_code || undefined,
    manufacturer: row.manufacturer || undefined,
    status: row.status || undefined,
    lastMaintenanceDate: row.last_maintenance_date || row.lastMaintenanceDate || undefined,
    description: row.description || undefined
  });

  const handleImportFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const rows = parseTextToRows(text);
    if (!rows || rows.length === 0) {
      showError('Không tìm thấy dữ liệu trong file');
      e.target.value = '';
      return;
    }

    setLoading(true);
    try {
      if (mode === 'reagent') {
        // map and create reagents sequentially
        for (const r of rows) {
          const payload = mapRowToReagentPayload(r);
          // avoid creating empty rows
          if (!payload.name) continue;
          // eslint-disable-next-line no-await-in-loop
          await warehouseService.createReagent(payload);
        }
        showSuccess('Import thuốc thử xong');
      } else {
        for (const r of rows) {
          const payload = mapRowToEquipmentPayload(r);
          if (!payload.name) continue;
          // eslint-disable-next-line no-await-in-loop
          await warehouseService.createEquipment(payload);
        }
        showSuccess('Import thiết bị xong');
      }
      await loadInventory();
    } catch (err) {
      showError('Lỗi khi import dữ liệu');
    } finally {
      e.target.value = '';
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    setIsDeleting(true);
    try {
      const result = mode === 'equipment'
        ? await warehouseService.deleteEquipment(itemToDelete)
        : await warehouseService.deleteReagent(itemToDelete);
      if (result.success) {
        showSuccess('Xóa thành công');
        loadInventory();
        setShowConfirmDialog(false);
        setItemToDelete(null);
      } else {
        showError(result.message);
      }
    } catch (error) {
      showError('Lỗi xóa dữ liệu');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (item) => {
    // Equipment status badges
    if (mode === 'equipment') {
      const s = (item.status || item.raw?.status || '').toString().toLowerCase();
      if (s.includes('active')) return <Badge bg="success">Hoạt động</Badge>;
      if (s.includes('maintenance') || s.includes('maint')) return <Badge bg="warning">Bảo trì</Badge>;
      if (s.includes('inactive') || s.includes('ngưng')) return <Badge bg="secondary">Ngưng</Badge>;
      return <Badge bg="secondary">{item.status || item.raw?.status || '-'}</Badge>;
    }

    // Reagent status badges - ưu tiên hiển thị status từ database
    const statusFromDb = (item.status || item.raw?.status || '').toString().trim();
    if (statusFromDb) {
      const s = statusFromDb.toLowerCase();
      // Kiểm tra các giá trị status phổ biến
      if (s.includes('in use') || s.includes('đang dùng') || s.includes('hoạt động')) {
        return <Badge bg="success">Đang sử dụng</Badge>;
      }
      if (s.includes('in stock') || s.includes('tồn kho') || s.includes('còn hàng')) {
        return <Badge bg="info">Còn hàng</Badge>;
      }
      if (s.includes('out of stock') || s.includes('hết hàng')) {
        return <Badge bg="danger">Hết hàng</Badge>;
      }
      if (s.includes('expired') || s.includes('hết hạn')) {
        return <Badge bg="danger">Hết hạn</Badge>;
      }
      // Nếu có status nhưng không khớp với các giá trị trên, hiển thị trực tiếp
      return <Badge bg="primary">{statusFromDb}</Badge>;
    }

    // Nếu không có status từ database, tính toán dựa trên số lượng
    const minQ = Number(item.minQuantity ?? item.raw?.minQuantity ?? NaN);
    const qty = Number(item.quantity ?? item.raw?.quantity ?? NaN);
    if (isNaN(qty)) return <Badge bg="secondary">Không rõ</Badge>;
    if (!isNaN(minQ)) {
      if (qty <= minQ) return <Badge bg="danger">Sắp hết</Badge>;
      if (qty <= minQ * 2) return <Badge bg="warning">Cảnh báo</Badge>;
      return <Badge bg="success">Đủ hàng</Badge>;
    }
    // Nếu có quantity nhưng không có minQuantity, hiển thị trạng thái dựa trên quantity
    if (qty === 0) return <Badge bg="danger">Hết hàng</Badge>;
    return <Badge bg="info">Còn hàng</Badge>;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex align-items-center mb-2">
            <h2 className="mb-0 me-3">
              <i className="fas fa-boxes me-2"></i>
              Quản lý kho
            </h2>
            <div className="btn-group" role="group" aria-label="inventory type">
              <button type="button" className={`btn btn-sm ${mode==='reagent' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => { setMode('reagent'); setInventory([]); loadInventory(); }}>
                Thuốc thử
              </button>
              <button type="button" className={`btn btn-sm ${mode==='equipment' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => { setMode('equipment'); setInventory([]); loadInventory(); }}>
                Thiết bị
              </button>
            </div>
          </div>
          <p className="text-muted">Quản lý thiết bị và thuốc thử</p>
        </Col>
        <Col xs="auto">
          <input
            id="import-file-input"
            type="file"
            accept=".csv,.tsv,text/csv,text/tab-separated-values"
            style={{ display: 'none' }}
            onChange={(e) => handleImportFile(e)}
          />
          <Button variant="outline-secondary" className="me-2" onClick={() => document.getElementById('import-file-input').click()}>
            <i className="fas fa-file-import me-2"></i>
            Import
          </Button>
          <Button variant="primary" onClick={handleCreate}>
            <i className="fas fa-plus me-2"></i>
            Thêm mới
          </Button>
        </Col>
      </Row>

      <Card>
        <Card.Header>
          <h5 className="mb-0">
            <i className="fas fa-list me-2"></i>
            Danh sách {mode === 'equipment' ? 'thiết bị' : 'thuốc thử'} ({inventory.length})
          </h5>
        </Card.Header>
        <Card.Body>
          {inventory.length > 0 ? (
            <Table responsive>
              <thead>
                <tr>
                  <th>{mode === 'equipment' ? 'Tên thiết bị' : 'Tên thuốc thử'}</th>
                  {mode === 'equipment' && <th>Mã</th>}
                  {mode === 'equipment' && <th>Bảo trì cuối</th>}
                  {mode === 'reagent' && <th>Số lượng</th>}
                  {mode === 'reagent' && <th>Đơn vị</th>}
                  
                  <th>Nhà cung cấp</th>
                  {mode === 'reagent' && <th>Hạn sử dụng</th>}
                  {mode === 'equipment' && <th>Mô tả</th>}
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    {mode === 'equipment' && <td>{item.code || item.raw?.code || '-'}</td>}
                    {mode === 'equipment' && <td>{item.lastMaintenanceDate ? formatDate(item.lastMaintenanceDate) : (item.raw?.last_maintenance_date ? formatDate(item.raw.last_maintenance_date) : '-')}</td>}
                    {mode === 'reagent' && <td>{item.quantity}</td>}
                    {mode === 'reagent' && <td>{normalizeUnit(item.unit || item.raw?.unit)}</td>}
                    
                    <td>{item.manufacturer || item.raw?.supplier || '-'}</td>
                    {mode === 'reagent' && <td>{item.expiryDate ? formatDate(item.expiryDate) : (item.raw?.expiryDate ? formatDate(item.raw.expiryDate) : '-')}</td>}
                    {mode === 'equipment' && <td>{item.description || item.raw?.description || '-'}</td>}
                    <td>{getStatusBadge(item)}</td>
                    <td>
                      <Button
                        variant="outline-info"
                        size="sm"
                        className="me-2"
                        onClick={() => handleViewDetail(item)}
                        title="Xem chi tiết"
                      >
                        <i className="fas fa-eye"></i>
                      </Button>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        onClick={() => handleEdit(item)}
                        title="Chỉnh sửa"
                      >
                        <i className="fas fa-edit"></i>
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        title="Xóa"
                      >
                        <i className="fas fa-trash"></i>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="text-center py-5">
              <i className="fas fa-boxes fa-3x text-muted mb-3"></i>
              <h5 className="text-muted">Chưa có hàng tồn kho nào</h5>
              <p className="text-muted">Hãy thêm hàng tồn kho để bắt đầu</p>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Modal thêm/sửa */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-edit me-2"></i>
            {editingItem ? 'Chỉnh sửa hàng tồn kho' : 'Thêm hàng tồn kho mới'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tên hàng *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              {mode === 'equipment' && (
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Mã thiết bị</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({...formData, code: e.target.value})}
                    />
                  </Form.Group>
                </Col>
              )}
              {mode === 'reagent' && (
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Trạng thái</Form.Label>
                    <Form.Select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                    >
                      <option value="">Chọn trạng thái</option>
                      <option value="In Stock">Còn hàng</option>
                      <option value="Out of Stock">Hết hàng</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              )}
            </Row>
            {mode === 'reagent' && (
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Số lượng *</Form.Label>
                    <Form.Control
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Đơn vị *</Form.Label>
                    <Form.Select
                      value={formData.unit && ['bottle', 'box', 'bag', 'tube', 'vial', 'pack', 'piece', 'set', 'roll', 'sheet', 'strip', 'cartridge', 'container', 'can', 'jar'].includes(formData.unit) ? formData.unit : 'other'}
                      onChange={(e) => {
                        if (e.target.value === 'other') {
                          setFormData({...formData, unit: formData.unit || ''});
                        } else {
                          setFormData({...formData, unit: e.target.value});
                        }
                      }}
                      required
                    >
                      <option value="">Chọn đơn vị</option>
                      <option value="bottle">Chai</option>
                      <option value="box">Hộp</option>
                      <option value="bag">Túi</option>
                      <option value="tube">Ống</option>
                      <option value="vial">Lọ</option>
                      <option value="pack">Gói</option>
                      <option value="piece">Cái</option>
                      <option value="set">Bộ</option>
                      <option value="roll">Cuộn</option>
                      <option value="sheet">Tờ</option>
                      <option value="strip">Que</option>
                      <option value="cartridge">Hộp mực</option>
                      <option value="container">Thùng</option>
                      <option value="can">Lon</option>
                      <option value="jar">Hũ</option>
                      <option value="other">Khác (nhập tùy chỉnh)</option>
                    </Form.Select>
                    {(formData.unit && !['bottle', 'box', 'bag', 'tube', 'vial', 'pack', 'piece', 'set', 'roll', 'sheet', 'strip', 'cartridge', 'container', 'can', 'jar'].includes(formData.unit)) && (
                      <Form.Control
                        type="text"
                        className="mt-2"
                        value={formData.unit}
                        onChange={(e) => setFormData({...formData, unit: e.target.value})}
                        placeholder="Nhập đơn vị tùy chỉnh"
                        required
                      />
                    )}
                  </Form.Group>
                </Col>
                {/* minQuantity removed by request; it's optional and not shown in the edit modal */}
              </Row>
            )}
            <Row>
              {mode === 'reagent' ? (
                <>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nhà cung cấp *</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.supplier}
                        onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                        required
                      />
                    </Form.Group>
                  </Col>
                </>
              ) : (
                <>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nhà cung cấp</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.supplier}
                        onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Trạng thái</Form.Label>
                      <Form.Select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                        <option value="">Chọn trạng thái</option>
                        <option value="active">Hoạt động</option>
                        <option value="inactive">Ngưng hoạt động</option>
                        <option value="maintenance">Bảo trì</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </>
              )}
            </Row>
            <Row>
              {mode === 'reagent' ? (
                <>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Ngày nhập</Form.Label>
                      <Form.Control
                        type="date"
                        value={formData.importDate}
                        onChange={(e) => setFormData({...formData, importDate: e.target.value})}
                        placeholder="dd/mm/yyyy"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Hạn sử dụng *</Form.Label>
                      <Form.Control
                        type="date"
                        value={formData.expiryDate}
                        onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                        required
                        placeholder="dd/mm/yyyy"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Lô nhập</Form.Label>
                      <Form.Control
                        type="text"
                        value={formData.importLot}
                        onChange={(e) => setFormData({...formData, importLot: e.target.value})}
                        placeholder="Ví dụ: LOT20251110"
                      />
                    </Form.Group>
                  </Col>
                </>
              ) : (
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Bảo trì cuối</Form.Label>
                    <Form.Control
                      type="date"
                      value={formData.lastMaintenanceDate || formData.expiryDate}
                      onChange={(e) => setFormData({...formData, lastMaintenanceDate: e.target.value})}
                      placeholder="dd/mm/yyyy"
                    />
                  </Form.Group>
                </Col>
              )}
            </Row>
            <Row>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Mô tả</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder={mode === 'reagent' ? 'Mô tả về thuốc thử, công dụng, cách sử dụng...' : 'Mô tả về thiết bị, thông số kỹ thuật...'}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              <i className="fas fa-save me-2"></i>
              {editingItem ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-info-circle me-2"></i>
            Chi tiết {mode === 'equipment' ? 'thiết bị' : 'thuốc thử'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {detailItem && (
            <div>
              <Row className="mb-3">
                <Col md={6}>
                  <strong>Tên {mode === 'equipment' ? 'thiết bị' : 'thuốc thử'}:</strong>
                  <p>{detailItem.name || detailItem.raw?.reagent_name || detailItem.raw?.name || '-'}</p>
                </Col>
                {mode === 'equipment' && (
                  <Col md={6}>
                    <strong>Mã thiết bị:</strong>
                    <p>{detailItem.code || detailItem.raw?.code || '-'}</p>
                  </Col>
                )}
                {mode === 'reagent' && (
                  <>
                    <Col md={6}>
                      <strong>Mã thuốc thử:</strong>
                      <p>{detailItem.code || detailItem.raw?.reagent_code || detailItem.raw?.code || '-'}</p>
                    </Col>
                    <Col md={6}>
                      <strong>Số lượng:</strong>
                      <p>{detailItem.quantity ?? detailItem.raw?.quantity ?? '-'}</p>
                    </Col>
                    <Col md={6}>
                      <strong>Đơn vị:</strong>
                      <p>{normalizeUnit(detailItem.unit || detailItem.raw?.unit)}</p>
                    </Col>
                    <Col md={6}>
                      <strong>Ngày nhập:</strong>
                      <p>{detailItem.importDate || detailItem.raw?.importDate || detailItem.raw?.import_date 
                        ? formatDate(detailItem.importDate || detailItem.raw?.importDate || detailItem.raw?.import_date) 
                        : '-'}</p>
                    </Col>
                    <Col md={6}>
                      <strong>Hạn sử dụng:</strong>
                      <p>{detailItem.expiryDate || detailItem.raw?.expiryDate || detailItem.raw?.expiry_date 
                        ? formatDate(detailItem.expiryDate || detailItem.raw?.expiryDate || detailItem.raw?.expiry_date) 
                        : '-'}</p>
                    </Col>
                    <Col md={6}>
                      <strong>Lô nhập:</strong>
                      <p>{detailItem.importLot || detailItem.raw?.importLot || detailItem.raw?.import_lot || '-'}</p>
                    </Col>
                  </>
                )}
                <Col md={6}>
                  <strong>Nhà cung cấp:</strong>
                  <p>{detailItem.manufacturer || detailItem.raw?.manufacturer || detailItem.raw?.supplier || '-'}</p>
                </Col>
                {mode === 'equipment' && (
                  <>
                    <Col md={6}>
                      <strong>Bảo trì cuối:</strong>
                      <p>{detailItem.lastMaintenanceDate || detailItem.raw?.last_maintenance_date 
                        ? formatDate(detailItem.lastMaintenanceDate || detailItem.raw?.last_maintenance_date) 
                        : '-'}</p>
                    </Col>
                    <Col md={6}>
                      <strong>Trạng thái:</strong>
                      <p>{getStatusBadge(detailItem)}</p>
                    </Col>
                  </>
                )}
                {mode === 'reagent' && (
                  <Col md={6}>
                    <strong>Trạng thái:</strong>
                    <p>{getStatusBadge(detailItem)}</p>
                  </Col>
                )}
              </Row>
              <Row>
                <Col>
                  <strong>Mô tả:</strong>
                  <div className="mt-2 p-3 bg-light rounded" style={{ minHeight: '100px', whiteSpace: 'pre-wrap' }}>
                    {detailItem.description || detailItem.raw?.description || 'Chưa có mô tả'}
                  </div>
                </Col>
              </Row>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
            Đóng
          </Button>
          {detailItem && (
            <Button variant="primary" onClick={() => {
              setShowDetailModal(false);
              handleEdit(detailItem);
            }}>
              <i className="fas fa-edit me-2"></i>
              Chỉnh sửa
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        show={showConfirmDialog}
        onHide={() => {
          setShowConfirmDialog(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Xác nhận xóa hàng tồn kho"
        message="Bạn có chắc chắn muốn xóa hàng tồn kho này? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        cancelText="Hủy"
        variant="danger"
        isLoading={isDeleting}
      />
    </Container>
  );
};

export default InventoryManagement;
