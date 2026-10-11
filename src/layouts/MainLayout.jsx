import React from 'react';
import { Navbar, Container, Nav, Dropdown } from 'react-bootstrap';
import { Link, Outlet, useNavigate } from 'react-router-dom';

const MainLayout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('bms_token');
    localStorage.removeItem('bms_user');
    navigate('/login');
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar bg="white" expand="lg" className="border-bottom shadow-sm sticky-top py-2">
        <Container fluid className="px-4">
          <Navbar.Brand as={Link} to="/" className="fw-bold text-primary d-flex align-items-center">
            <i className="bi bi-droplet-fill me-2 fs-4 text-danger"></i>
            <span>BMS Laboratory</span>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="main-navbar-nav" />
          <Navbar.Collapse id="main-navbar-nav">
            <Nav className="me-auto ms-3 gap-2">
              <Nav.Link as={Link} to="/dashboard" className="fw-semibold">
                <i className="bi bi-speedometer2 me-1"></i>Dashboard (UC12)
              </Nav.Link>
              <Nav.Link as={Link} to="/lab/queue" className="fw-semibold">
                <i className="bi bi-inbox me-1"></i>Hàng Đợi Lab (UC17)
              </Nav.Link>
              <Nav.Link as={Link} to="/register" className="fw-semibold">
                <i className="bi bi-person-plus me-1"></i>Đăng Ký (UC02)
              </Nav.Link>
              <Nav.Link as={Link} to="/change-password" className="fw-semibold">
                <i className="bi bi-key me-1"></i>Đổi Mật Khẩu (UC07)
              </Nav.Link>
            </Nav>
            <Nav className="align-items-center gap-3">
              <Dropdown align="end">
                <Dropdown.Toggle variant="light" id="user-dropdown" className="border-0 d-flex align-items-center gap-2">
                  <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                    <i className="bi bi-person-fill"></i>
                  </div>
                  <span className="fw-semibold small">Võ Gia Huy</span>
                </Dropdown.Toggle>
                <Dropdown.Menu className="shadow border-0 rounded-3">
                  <Dropdown.Item as={Link} to="/change-password">
                    <i className="bi bi-key me-2"></i>Đổi mật khẩu (UC07)
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={handleLogout} className="text-danger">
                    <i className="bi bi-box-arrow-right me-2"></i>Đăng xuất
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <main className="flex-grow-1 bg-light">
        <Outlet />
      </main>

      <footer className="bg-white border-top py-3 text-center text-muted small">
        <Container>
          &copy; {new Date().getFullYear()} BMS - Blood Laboratory Management System. Graduation Capstone SEP490.
        </Container>
      </footer>
    </div>
  );
};

export default MainLayout;
