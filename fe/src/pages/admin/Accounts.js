import React, { useEffect, useState } from 'react';
import { Container, Card, Row, Col, Table, Button, Modal, Form, Alert, InputGroup, Badge } from 'react-bootstrap';
import { FaUsers, FaPlus, FaEdit, FaTrash, FaSearch, FaLock, FaEnvelope, FaUser } from 'react-icons/fa';
import { adminService } from '../../services/adminService';
import { getAdminData } from '../../services/adminDataPrefetchService';
import { authService } from '../../services/authService';
import useResponsive from '../../shared/hooks/useResponsive';
import { useAutoRefresh, dispatchRefreshEvent, setRefreshFlag } from '../../shared/hooks/useAutoRefresh';

const AdminAccounts = () => {
  const { isMobile, isTablet } = useResponsive();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ fullName: '', username: '', email: '', role: 'user', password: '', isActive: true });
  const [search, setSearch] = useState('');

  const loadAccounts = async (forceFresh = false) => {
    try {
      setLoading(true);
      
      // Try to get from cache first for faster loading (unless forceFresh is true)
      if (!forceFresh) {
        const cachedResult = await getAdminData('users', false);
        if (cachedResult.success && cachedResult.data) {
          setAccounts(Array.isArray(cachedResult.data) ? cachedResult.data : []);
          setLoading(false);
          // If from cache, refresh in background
          if (cachedResult.fromCache) {
            getAdminData('users', true).then(result => {
              if (result.success && result.data) {
                setAccounts(Array.isArray(result.data) ? result.data : []);
              }
            }).catch(() => {});
          }
          return;
        }
      }
      
      // Fallback to direct service call or force fresh fetch
      const res = await adminService.getAccounts();
      if (res && res.success) setAccounts(res.data || []);
      else setError(res.message || 'Lỗi tải danh sách tài khoản');
    } catch (err) {
      setError('Lỗi tải danh sách tài khoản');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh hook
  useAutoRefresh(loadAccounts, {
    eventName: 'accountsChanged',
    flagKey: 'shouldRefreshAccounts'
  });

  useEffect(() => {
    const current = authService.getCurrentUser();
    const isAdmin = current && (String(current.role || '').toLowerCase().includes('admin') || Number(current.roleId) === 1);
    if (!isAdmin) {
      setError('Bạn không có quyền truy cập trang này.');
      setLoading(false);
      return;
    }
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ fullName: '', username: '', email: '', role: 'user', password: '', isActive: true });
    setShowModal(true);
  };

  const openEdit = (acct) => {
    setEditing(acct);
    setForm({ fullName: acct.fullName || '', username: acct.username || acct.email || '', email: acct.email || '', role: acct.role || 'user', password: '', isActive: acct.isActive !== false });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        const res = await adminService.updateAccount(editing.id, { fullName: form.fullName, username: form.username, email: form.email, role: form.role, isActive: form.isActive });
        if (res.success) {
          setSuccess('Cập nhật tài khoản thành công');
          setRefreshFlag('accounts');
          dispatchRefreshEvent('accounts', 'updated', { accountId: editing.id });
          loadAccounts(true);
          setShowModal(false);
        } else setError(res.message || 'Lỗi cập nhật');
      } else {
        const payload = { fullName: form.fullName, username: form.username, email: form.email, role: form.role, password: form.password, isActive: form.isActive };
        const res = await adminService.createAccount(payload);
        if (res.success) {
          setSuccess('Tạo tài khoản thành công');
          setRefreshFlag('accounts');
          dispatchRefreshEvent('accounts', 'created', { accountId: res.data?.id });
          loadAccounts(true);
          setShowModal(false);
        } else setError(res.message || 'Lỗi tạo tài khoản');
      }
    } catch (err) {
      setError('Lỗi khi lưu tài khoản');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa tài khoản này?')) return;
    try {
      const res = await adminService.deleteAccount(id);
      if (res.success) {
        setSuccess('Xóa tài khoản thành công');
        setRefreshFlag('accounts');
        dispatchRefreshEvent('accounts', 'deleted', { accountId: id });
        loadAccounts(true);
      } else setError(res.message || 'Lỗi xóa tài khoản');
    } catch (err) {
      setError('Lỗi xóa tài khoản');
    }
  };

  const filtered = accounts.filter(a => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (a.fullName || '').toLowerCase().includes(s) || (a.username || '').toLowerCase().includes(s) || (a.email || '').toLowerCase().includes(s) || (String(a.id || '')).includes(s);
  });

  return (
    <Container fluid className="py-3" style={{ 
      overflowX: 'hidden', 
      maxWidth: '100%', 
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <Row className="mb-3">
        <Col>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
            <div>
              <h3 style={{ fontSize: 'clamp(1.25rem, 4vw, 1.5rem)' }}><FaUsers className="me-2" />Quản lý tài khoản</h3>
              <p className="text-muted mb-0 d-none d-md-block">Tạo, sửa, xóa và quản lý quyền người dùng</p>
            </div>
            <div className="d-flex gap-2 w-100 w-md-auto">
              <Button variant="outline-secondary" size="sm" onClick={loadAccounts} className="flex-fill flex-md-grow-0">
                <span className="d-none d-sm-inline">Tải lại</span>
                <span className="d-sm-none">↻</span>
              </Button>
              <Button variant="primary" size="sm" onClick={openCreate} className="flex-fill flex-md-grow-0">
                <FaPlus className="me-2" />
                <span className="d-none d-sm-inline">Tạo tài khoản</span>
                <span className="d-sm-none">Tạo</span>
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      <Card className="mb-3">
        <Card.Body>
          <Row className="align-items-center">
            <Col xs={12} md={6} lg={4}>
              <InputGroup>
                <InputGroup.Text><FaSearch /></InputGroup.Text>
                <Form.Control 
                  placeholder="Tìm theo tên, email hoặc username" 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}
                />
              </InputGroup>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th className="d-none d-md-table-cell">ID</th>
                  <th>Họ tên</th>
                  <th className="d-none d-lg-table-cell">Username / Email</th>
                  <th className="d-lg-none">Email</th>
                  <th>Vai trò</th>
                  <th className="d-none d-md-table-cell">Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(acc => (
                  <tr key={acc.id}>
                    <td className="d-none d-md-table-cell">{acc.id}</td>
                    <td style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>{acc.fullName}</td>
                    <td className="d-none d-lg-table-cell">{acc.username || acc.email}</td>
                    <td className="d-lg-none" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>{acc.email || acc.username}</td>
                    <td><Badge bg="secondary" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>{acc.role}</Badge></td>
                    <td className="d-none d-md-table-cell">
                      <Badge bg={acc.isActive ? 'success' : 'secondary'}>{acc.isActive ? 'Active' : 'Disabled'}</Badge>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <Button size="sm" variant="outline-primary" onClick={() => openEdit(acc)} title="Chỉnh sửa">
                          <FaEdit />
                        </Button>
                        <Button size="sm" variant="outline-danger" onClick={() => handleDelete(acc.id)} title="Xóa">
                          <FaTrash />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">Không tìm thấy tài khoản</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>{editing ? 'Chỉnh sửa tài khoản' : 'Tạo tài khoản mới'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-2">
              <Form.Label>Họ tên</Form.Label>
              <Form.Control value={form.fullName} onChange={(e) => setForm({...form, fullName: e.target.value})} required />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Username</Form.Label>
              <Form.Control value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} required />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Email</Form.Label>
              <Form.Control type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
            </Form.Group>
            {!editing && (
              <Form.Group className="mb-2">
                <Form.Label><FaLock className="me-1" />Mật khẩu</Form.Label>
                <Form.Control type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required />
              </Form.Group>
            )}
            <Form.Group className="mb-2">
              <Form.Label>Vai trò</Form.Label>
              <Form.Select value={form.role} onChange={(e) => setForm({...form, role: e.target.value})}>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="doctor">Doctor</option>
                <option value="lab_user">Lab User</option>
                <option value="receptionist">Receptionist</option>
                <option value="user">User</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Check type="checkbox" label="Kích hoạt" checked={form.isActive} onChange={(e) => setForm({...form, isActive: e.target.checked})} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Hủy</Button>
            <Button variant="primary" type="submit">Lưu</Button>
          </Modal.Footer>
        </Form>
      </Modal>

    </Container>
  );
};

export default AdminAccounts;
