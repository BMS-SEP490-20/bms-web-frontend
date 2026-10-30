/**
 * Patient Feedback & Rating Hub Page
 * 
 * Supports:
 * - Patients: Submit new feedback/ratings, view past submissions, edit/delete own reviews.
 * - Clinic Managers: Review all feedback, analyze rating distribution, and submit official replies.
 * - Doctors, Receptionists, Administrators: View patient reviews, service department ratings, and manager responses.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Row, Col, Card, Badge, Button, Form, 
  InputGroup, Modal, Spinner, ProgressBar, Alert 
} from 'react-bootstrap';
import { 
  FaStar, FaRegStar, FaComments, FaReply, 
  FaEdit, FaTrashAlt, FaSearch, FaSyncAlt, 
  FaUserCheck, FaUserSecret, FaUserMd, FaPlus, FaArrowLeft
} from 'react-icons/fa';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { patientFeedbackService } from '../../../services/patientFeedbackService';

const FeedbackHubPage = () => {
  const navigate = useNavigate();
  const { user, userRole, userRoleId } = useAuth();

  // The server is the authoritative boundary for authorization and MongoDB operations.
  // These client-side role checks tailor the UI presentation (tabs, modals, and actions).
  const isPatient = useMemo(() => {
    const roleIdNum = typeof userRoleId === 'string' ? parseInt(userRoleId, 10) : userRoleId;
    return roleIdNum === 5 || userRole === 'patient';
  }, [userRoleId, userRole]);

  // Exclusively Admin has permission to moderate and delete feedback
  const isAdmin = useMemo(() => {
    const roleIdNum = typeof userRoleId === 'string' ? parseInt(userRoleId, 10) : userRoleId;
    return roleIdNum === 1 || userRole === 'admin' || userRole === 'administrator';
  }, [userRoleId, userRole]);

  // Clinic Managers and Admins can view analytics and submit official responses
  const isManagerOrAdmin = useMemo(() => {
    const roleIdNum = typeof userRoleId === 'string' ? parseInt(userRoleId, 10) : userRoleId;
    return roleIdNum === 1 || roleIdNum === 2 || userRole === 'admin' || userRole === 'manager';
  }, [userRoleId, userRole]);



  const [feedbacks, setFeedbacks] = useState([]);
  const [myFeedbacks, setMyFeedbacks] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alertMsg, setAlertMsg] = useState(null);
  const [filterMyOnly, setFilterMyOnly] = useState(false);

  // Filters
  const [ratingFilter, setRatingFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & Forms
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    rating: 5,
    serviceCategory: 'Tư vấn bác sĩ',
    title: '',
    comment: '',
    appointmentId: '',
    doctorName: '',
    isAnonymous: false
  });

  // Edit Form State
  const [editForm, setEditForm] = useState({
    rating: 5,
    serviceCategory: 'Tư vấn bác sĩ',
    title: '',
    comment: '',
    isAnonymous: false
  });

  // Response Form State (For Manager)
  const [responseForm, setResponseForm] = useState({
    response: '',
    respondedBy: user?.fullName || 'Quản lý phòng khám (Clinic Manager)'
  });

  const fetchFeedbacks = useCallback(async () => {
    try {
      setLoading(true);
      const ratingVal = ratingFilter !== 'ALL' ? parseInt(ratingFilter) : null;
      const [feedbacksRes, statsRes] = await Promise.all([
        patientFeedbackService.getFeedbacks({
          rating: ratingVal,
          category: categoryFilter,
          status: statusFilter,
          searchTerm: searchTerm.trim()
        }),
        patientFeedbackService.getStatistics()
      ]);

      if (feedbacksRes.success) {
        setFeedbacks(feedbacksRes.data);
      }
      if (statsRes.success) {
        setStatistics(statsRes.data);
      }

      // If user is patient, also fetch personal feedbacks
      if (user?.id) {
        const myRes = await patientFeedbackService.getPatientFeedbacks(user.id);
        if (myRes.success) {
          setMyFeedbacks(myRes.data);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [ratingFilter, categoryFilter, statusFilter, searchTerm, user]);

  const displayedFeedbacks = useMemo(() => {
    if (filterMyOnly && isPatient && user?.id) {
      return feedbacks.filter(f => f.patientId === user.id);
    }
    return feedbacks;
  }, [feedbacks, filterMyOnly, isPatient, user]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  // Handle Create Feedback Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        ...createForm,
        patientId: user?.id || 'PAT-DEMO',
        patientName: user?.fullName || user?.username || 'Bệnh nhân',
        patientEmail: user?.email || '',
        patientPhone: user?.phone || ''
      };

      const res = await patientFeedbackService.createFeedback(payload);
      if (res.success) {
        setAlertMsg({ type: 'success', text: 'Cảm ơn quý khách! Đánh giá và góp ý của bạn đã được gửi tới Ban Quản Lý.' });
        setShowCreateModal(false);
        setCreateForm({
          rating: 5,
          serviceCategory: 'Tư vấn bác sĩ',
          title: '',
          comment: '',
          appointmentId: '',
          doctorName: '',
          isAnonymous: false
        });
        fetchFeedbacks();
      } else {
        setAlertMsg({ type: 'danger', text: res.message || 'Lỗi gửi đánh giá' });
      }
    } catch (err) {
      setAlertMsg({ type: 'danger', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Feedback Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFeedback) return;
    try {
      setSubmitting(true);
      const res = await patientFeedbackService.updateFeedback(selectedFeedback.feedbackId, editForm);
      if (res.success) {
        setAlertMsg({ type: 'success', text: 'Cập nhật đánh giá thành công!' });
        setShowEditModal(false);
        fetchFeedbacks();
      } else {
        setAlertMsg({ type: 'danger', text: res.message || 'Lỗi cập nhật' });
      }
    } catch (err) {
      setAlertMsg({ type: 'danger', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Manager Response Submit
  const handleResponseSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFeedback) return;
    try {
      setSubmitting(true);
      const res = await patientFeedbackService.respondToFeedback(selectedFeedback.feedbackId, {
        response: responseForm.response,
        respondedBy: responseForm.respondedBy || user?.fullName || 'Quản lý phòng khám'
      });
      if (res.success) {
        setAlertMsg({ type: 'success', text: 'Đã gửi phản hồi chính thức cho bệnh nhân thành công!' });
        setShowResponseModal(false);
        fetchFeedbacks();
      } else {
        setAlertMsg({ type: 'danger', text: res.message || 'Lỗi gửi phản hồi' });
      }
    } catch (err) {
      setAlertMsg({ type: 'danger', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Submit
  const handleDeleteSubmit = async () => {
    if (!selectedFeedback) return;
    try {
      setSubmitting(true);
      const res = await patientFeedbackService.deleteFeedback(selectedFeedback.feedbackId);
      if (res.success) {
        setAlertMsg({ type: 'success', text: 'Đã xóa bản ghi đánh giá thành công!' });
        setShowDeleteModal(false);
        fetchFeedbacks();
      } else {
        setAlertMsg({ type: 'danger', text: res.message || 'Lỗi xóa' });
      }
    } catch (err) {
      setAlertMsg({ type: 'danger', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (fb) => {
    setSelectedFeedback(fb);
    setEditForm({
      rating: fb.rating,
      serviceCategory: fb.serviceCategory,
      title: fb.title,
      comment: fb.comment,
      isAnonymous: fb.isAnonymous
    });
    setShowEditModal(true);
  };

  const openResponseModal = (fb) => {
    setSelectedFeedback(fb);
    setResponseForm({
      response: fb.managerResponse || '',
      respondedBy: user?.fullName || 'Quản lý phòng khám (Manager)'
    });
    setShowResponseModal(true);
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        i <= rating ? (
          <FaStar key={i} className="text-warning me-1" />
        ) : (
          <FaRegStar key={i} className="text-muted me-1" />
        )
      );
    }
    return <span className="d-inline-flex align-items-center">{stars}</span>;
  };

  return (
    <div className="w-100">
      {/* Top Banner */}
      <Card className="border-0 shadow-sm rounded-4 mb-4 bg-white">
        <Card.Body className="p-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <h4 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                  <FaComments className="text-primary" />
                  Góp Ý & Đánh Giá Dịch Vụ (Patient Feedback)
                </h4>
                <Badge bg="primary-subtle" className="text-primary border border-primary-subtle px-3 py-2 rounded-pill fw-semibold">
                  {isPatient ? 'Bệnh nhân (Patient)' : isManagerOrAdmin ? 'Ban Quản Lý (Clinic Manager)' : 'Bác Sĩ & Nhân Viên'}
                </Badge>
              </div>
              <p className="text-muted mb-0 small mt-1">
                {isPatient 
                  ? 'Gửi đánh giá trải nghiệm khám & xét nghiệm, đóng góp ý kiến để giúp phòng khám nâng cao chất lượng phục vụ.'
                  : 'Theo dõi phản hồi, mức độ hài lòng của bệnh nhân và tương tác phản hồi chính thức từ Ban Quản Lý.'
                }
              </p>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              {/* Patient quick return button */}
              {isPatient && (
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => navigate('/patient/dashboard')}
                  className="d-flex align-items-center gap-2 rounded-pill px-3 py-2 shadow-sm"
                >
                  <FaArrowLeft />
                  <span>Quay về Dashboard</span>
                </Button>
              )}

              {/* Only Patient role can create new feedback; other roles can only inspect */}
              {isPatient && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowCreateModal(true)}
                  className="d-flex align-items-center gap-2 rounded-pill px-3 py-2 shadow-sm"
                >
                  <FaPlus />
                  <span>Gửi đánh giá mới</span>
                </Button>
              )}

              <Button
                variant="light"
                size="sm"
                onClick={fetchFeedbacks}
                disabled={loading}
                className="d-flex align-items-center gap-2 border rounded-pill px-3 py-2"
              >
                <FaSyncAlt className={loading ? 'fa-spin' : ''} />
                <span>Làm mới</span>
              </Button>
            </div>

          </div>
        </Card.Body>
      </Card>

      {alertMsg && (
        <Alert variant={alertMsg.type} dismissible onClose={() => setAlertMsg(null)} className="rounded-4 shadow-sm">
          {alertMsg.text}
        </Alert>
      )}

      {/* Statistics Overview Card */}
      {statistics && (
        <Row className="g-3 mb-4">
          <Col xs={12} md={4}>
            <Card className="border-0 shadow-sm rounded-4 h-100 bg-white">
              <Card.Body className="p-4 text-center d-flex flex-column justify-content-center">
                <div className="text-muted small fw-semibold text-uppercase mb-2">Đánh giá trung bình</div>
                <div className="display-4 fw-bold text-dark mb-1 d-flex align-items-center justify-content-center gap-2">
                  <span>{statistics.averageRating}</span>
                  <FaStar className="text-warning fs-3" />
                </div>
                <div className="mb-2">
                  {renderStars(Math.round(statistics.averageRating))}
                </div>
                <div className="text-muted small">
                  Dựa trên <strong>{statistics.totalFeedbacks}</strong> lượt đánh giá từ bệnh nhân
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} md={5}>
            <Card className="border-0 shadow-sm rounded-4 h-100 bg-white">
              <Card.Body className="p-4">
                <div className="text-muted small fw-semibold text-uppercase mb-3">Phân bổ xếp hạng sao</div>
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = statistics.ratingDistribution?.[star] || 0;
                  const pct = statistics.totalFeedbacks > 0 ? (count / statistics.totalFeedbacks) * 100 : 0;
                  return (
                    <div key={star} className="d-flex align-items-center gap-2 mb-2 small">
                      <span className="fw-semibold text-dark" style={{ width: '35px' }}>{star} ★</span>
                      <div className="flex-grow-1">
                        <ProgressBar 
                          now={pct} 
                          variant={star >= 4 ? 'success' : star === 3 ? 'warning' : 'danger'} 
                          style={{ height: '8px' }} 
                          className="rounded-pill"
                        />
                      </div>
                      <span className="text-muted text-end" style={{ width: '40px' }}>{count}</span>
                    </div>
                  );
                })}
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} md={3}>
            <Card className="border-0 shadow-sm rounded-4 h-100 bg-white">
              <Card.Body className="p-4 d-flex flex-column justify-content-between">
                <div>
                  <div className="text-muted small fw-semibold text-uppercase mb-1">Đã phản hồi (Manager Reply)</div>
                  <h3 className="fw-bold text-success mb-0">{statistics.respondedFeedbacks}</h3>
                  <small className="text-muted">Ban Quản Lý đã giải đáp</small>
                </div>
                <hr className="my-2" />
                <div>
                  <div className="text-muted small fw-semibold text-uppercase mb-1">Chờ tiếp nhận</div>
                  <h3 className="fw-bold text-warning mb-0">{statistics.pendingFeedbacks}</h3>
                  <small className="text-muted">Đang chờ xử lý ý kiến</small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Filter Bar */}
      <Card className="border-0 shadow-sm rounded-4 mb-4 bg-white">
        <Card.Body className="p-3">
          <Row className="g-3">
            <Col xs={12} md={4}>
              <InputGroup>
                <InputGroup.Text className="bg-light border-end-0">
                  <FaSearch className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Tìm theo tiêu đề, nội dung, tên bệnh nhân, bác sĩ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-light border-start-0"
                />
              </InputGroup>
            </Col>
            <Col xs={6} sm={4} md={2}>
              <Form.Select 
                value={ratingFilter} 
                onChange={(e) => setRatingFilter(e.target.value)}
                className="bg-light"
              >
                <option value="ALL">Tất cả số sao</option>
                <option value="5">5 Sao (Tuyệt vời)</option>
                <option value="4">4 Sao (Tốt)</option>
                <option value="3">3 Sao (Bình thường)</option>
                <option value="2">2 Sao (Cần cải thiện)</option>
                <option value="1">1 Sao (Kém)</option>
              </Form.Select>
            </Col>
            <Col xs={6} sm={4} md={3}>
              <Form.Select 
                value={categoryFilter} 
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-light"
              >
                <option value="ALL">Tất cả nhóm dịch vụ</option>
                <option value="Đón tiếp & Lễ tân">Đón tiếp & Lễ tân</option>
                <option value="Lấy mẫu máu & Xét nghiệm">Lấy mẫu máu & Xét nghiệm</option>
                <option value="Tư vấn bác sĩ">Tư vấn bác sĩ</option>
                <option value="Thời gian chờ & Cơ sở vật chất">Cơ sở vật chất & Thời gian chờ</option>
                <option value="Thanh toán & Hóa đơn">Thanh toán & Hóa đơn</option>
              </Form.Select>
            </Col>
            <Col xs={12} sm={4} md={3}>
              <Form.Select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-light"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PENDING">Chờ phản hồi</option>
                <option value="REVIEWED">Đã xem xét</option>
                <option value="RESPONDED">Đã có lời đáp từ Quản lý</option>
              </Form.Select>
            </Col>
          </Row>

          {isPatient && myFeedbacks.length > 0 && (
            <div className="mt-3 pt-2 border-top d-flex align-items-center gap-2">
              <Form.Check 
                type="switch"
                id="filter-my-only"
                label={`Chỉ xem đánh giá của tôi (${myFeedbacks.length} bài viết)`}
                checked={filterMyOnly}
                onChange={(e) => setFilterMyOnly(e.target.checked)}
                className="fw-semibold text-primary small"
              />
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Feedbacks List */}
      {loading && displayedFeedbacks.length === 0 ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted small">Đang tải danh sách đánh giá & phản hồi...</p>
        </div>
      ) : displayedFeedbacks.length > 0 ? (
        <div className="d-flex flex-column gap-3">
          {displayedFeedbacks.map((fb) => {
            const isOwn = isPatient && user?.id === fb.patientId;
            return (
              <Card key={fb.feedbackId} className="border-0 shadow-sm rounded-4 overflow-hidden bg-white">
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                    {/* Review Header */}
                    <div className="d-flex align-items-center gap-3">
                      <div 
                        className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{
                          width: '46px',
                          height: '46px',
                          backgroundColor: fb.isAnonymous ? '#f3f4f6' : '#e0f2fe',
                          color: fb.isAnonymous ? '#6b7280' : '#0284c7'
                        }}
                      >
                        {fb.isAnonymous ? <FaUserSecret className="fs-5" /> : <FaUserCheck className="fs-5" />}
                      </div>
                      <div>
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <h6 className="mb-0 fw-bold text-dark">{fb.patientName}</h6>
                          {fb.isAnonymous && (
                            <Badge bg="secondary" className="px-2 py-1 rounded-pill" style={{ fontSize: '0.7rem' }}>
                              Ẩn danh
                            </Badge>
                          )}
                          <Badge bg="primary-subtle" className="text-primary border border-primary-subtle px-2 py-1 rounded-pill fw-normal" style={{ fontSize: '0.75rem' }}>
                            {fb.serviceCategory}
                          </Badge>
                          {fb.status === 'DELETED' && (
                            <Badge bg="danger-subtle" className="text-danger border border-danger-subtle px-2 py-1 rounded-pill fw-semibold" style={{ fontSize: '0.75rem' }}>
                              Feedback đã bị admin xóa
                            </Badge>
                          )}
                        </div>
                        <div className="d-flex align-items-center gap-2 text-muted small mt-1">
                          {renderStars(fb.rating)}
                          <span className="ms-1 fw-bold text-dark">{fb.rating}.0</span>
                          <span>•</span>
                          <span>{new Date(fb.createdAt).toLocaleDateString('vi-VN')} {new Date(fb.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                          {fb.doctorName && (
                            <>
                              <span>•</span>
                              <span className="text-primary"><FaUserMd className="me-1" />{fb.doctorName}</span>
                            </>
                          )}
                          {fb.appointmentId && (
                            <>
                              <span>•</span>
                              <span className="font-monospace text-secondary">#{fb.appointmentId}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="d-flex align-items-center gap-2">
                      {/* Clinic Manager reply button */}
                      {isManagerOrAdmin && fb.status !== 'DELETED' && (
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="rounded-pill px-3 py-1 d-flex align-items-center gap-1"
                          onClick={() => openResponseModal(fb)}
                        >
                          <FaReply />
                          <span>{fb.managerResponse ? 'Sửa phản hồi' : 'Phản hồi bệnh nhân'}</span>
                        </Button>
                      )}

                      {/* Only Patient can edit their own feedback */}
                      {isPatient && isOwn && fb.status !== 'DELETED' && (
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="rounded-pill px-3 py-1 d-flex align-items-center gap-1"
                          onClick={() => openEditModal(fb)}
                        >
                          <FaEdit />
                          <span>Chỉnh sửa</span>
                        </Button>
                      )}

                      {/* Only Admin has permission to delete feedback */}
                      {isAdmin && fb.status !== 'DELETED' && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="rounded-circle p-1"
                          style={{ width: '30px', height: '30px' }}
                          onClick={() => {
                            setSelectedFeedback(fb);
                            setShowDeleteModal(true);
                          }}
                          title="Xóa đánh giá (Chỉ dành cho Admin)"
                        >
                          <FaTrashAlt style={{ fontSize: '0.75rem' }} />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Review Content */}
                  {fb.status === 'DELETED' ? (
                    <div className="mt-3 p-3 bg-danger-subtle border border-danger-subtle rounded-3 text-danger d-flex align-items-center gap-2">
                      <FaTrashAlt className="flex-shrink-0" />
                      <span className="fw-semibold">Feedback đã bị admin xóa</span>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <h6 className="fw-bold text-dark mb-1">{fb.title}</h6>
                      <p className="text-secondary mb-0" style={{ lineHeight: '1.6' }}>
                        {fb.comment}
                      </p>
                    </div>
                  )}

                  {/* Manager Response Box if present */}
                  {fb.managerResponse && (
                    <div className="mt-3 p-3 bg-primary-subtle border border-primary-subtle rounded-3 small">
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <span className="fw-bold text-primary d-flex align-items-center gap-1">
                          <FaReply /> Phản hồi từ Ban Quản Lý Phòng Khám:
                        </span>
                        {fb.respondedAt && (
                          <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {new Date(fb.respondedAt).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                      </div>
                      <div className="text-dark" style={{ lineHeight: '1.5' }}>
                        {fb.managerResponse}
                      </div>
                      {fb.respondedBy && (
                        <div className="text-muted mt-1 text-end" style={{ fontSize: '0.75rem' }}>
                          — <em>{fb.respondedBy}</em>
                        </div>
                      )}
                    </div>
                  )}
                </Card.Body>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-0 shadow-sm rounded-4 text-center py-5 bg-white">
          <Card.Body>
            <FaComments className="text-muted mb-3" style={{ fontSize: '3rem', opacity: 0.3 }} />
            <h5 className="text-dark fw-bold">Chưa có phản hồi nào phù hợp</h5>
            <p className="text-muted small mb-0">Thử thay đổi bộ lọc tìm kiếm hoặc gửi phản hồi mới.</p>
          </Card.Body>
        </Card>
      )}

      {/* Create Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold d-flex align-items-center gap-2">
            <FaStar className="text-warning" />
            Gửi Đánh Giá & Góp Ý Dịch Vụ
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateSubmit}>
          <Modal.Body className="pt-3">
            <div className="mb-3 text-center p-3 bg-light rounded-3">
              <label className="fw-semibold small text-muted d-block mb-2">Chọn mức độ hài lòng của bạn</label>
              <div className="d-flex justify-content-center align-items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="btn p-1 border-0 bg-transparent"
                    onClick={() => setCreateForm({ ...createForm, rating: star })}
                  >
                    {star <= createForm.rating ? (
                      <FaStar className="text-warning display-6" />
                    ) : (
                      <FaRegStar className="text-muted display-6" />
                    )}
                  </button>
                ))}
              </div>
              <div className="mt-2 fw-bold text-primary">
                {createForm.rating === 5 && '🌟 Tuyệt vời - Rất hài lòng'}
                {createForm.rating === 4 && '👍 Tốt - Hài lòng'}
                {createForm.rating === 3 && '👌 Bình thường - Tạm ổn'}
                {createForm.rating === 2 && '⚠️ Cần cải thiện dịch vụ'}
                {createForm.rating === 1 && '👎 Rất không hài lòng'}
              </div>
            </div>

            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Bộ phận / Dịch vụ bạn muốn đánh giá</Form.Label>
                  <Form.Select
                    value={createForm.serviceCategory}
                    onChange={(e) => setCreateForm({ ...createForm, serviceCategory: e.target.value })}
                  >
                    <option value="Đón tiếp & Lễ tân">Đón tiếp & Lễ tân (Reception)</option>
                    <option value="Lấy mẫu máu & Xét nghiệm">Lấy mẫu máu & Phòng xét nghiệm</option>
                    <option value="Tư vấn bác sĩ">Tư vấn bác sĩ (Doctor consultation)</option>
                    <option value="Thời gian chờ & Cơ sở vật chất">Thời gian chờ & Cơ sở vật chất</option>
                    <option value="Thanh toán & Hóa đơn">Thanh toán & Xuất hóa đơn</option>
                    <option value="Dịch vụ chung">Dịch vụ chung</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Bác sĩ phụ trách (nếu có)</Form.Label>
                  <Form.Control
                    placeholder="VD: BS. Trần Minh, BS. Lê Hoàng..."
                    value={createForm.doctorName}
                    onChange={(e) => setCreateForm({ ...createForm, doctorName: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Tiêu đề đánh giá</Form.Label>
                  <Form.Control
                    required
                    placeholder="Tóm tắt ngắn gọn cảm nhận của bạn..."
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Nội dung chi tiết nhận xét / đóng góp ý kiến</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    required
                    placeholder="Chia sẻ trải nghiệm cụ thể về thái độ phục vụ, quy trình lấy máu, tư vấn kết quả hoặc những điểm phòng khám cần cải thiện..."
                    value={createForm.comment}
                    onChange={(e) => setCreateForm({ ...createForm, comment: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Check 
                  type="checkbox"
                  id="anonymous-check"
                  label="Gửi đánh giá dưới dạng Ẩn danh (Không hiển thị họ tên của tôi)"
                  checked={createForm.isAnonymous}
                  onChange={(e) => setCreateForm({ ...createForm, isAnonymous: e.target.checked })}
                  className="small text-muted"
                />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="border-0">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Hủy</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Đang gửi...' : 'Gửi đánh giá ngay'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Edit Modal (Patient) */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold d-flex align-items-center gap-2">
            <FaEdit className="text-primary" />
            Chỉnh Sửa Đánh Giá Của Bạn
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditSubmit}>
          <Modal.Body className="pt-3">
            <div className="mb-3 text-center p-3 bg-light rounded-3">
              <label className="fw-semibold small text-muted d-block mb-2">Mức độ hài lòng</label>
              <div className="d-flex justify-content-center align-items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="btn p-1 border-0 bg-transparent"
                    onClick={() => setEditForm({ ...editForm, rating: star })}
                  >
                    {star <= editForm.rating ? (
                      <FaStar className="text-warning display-6" />
                    ) : (
                      <FaRegStar className="text-muted display-6" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <Row className="g-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Tiêu đề</Form.Label>
                  <Form.Control
                    required
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Nội dung nhận xét</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    required
                    value={editForm.comment}
                    onChange={(e) => setEditForm({ ...editForm, comment: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="border-0">
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>Hủy</Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Response Modal (Manager) */}
      <Modal show={showResponseModal} onHide={() => setShowResponseModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold d-flex align-items-center gap-2">
            <FaReply className="text-primary" />
            Phản Hồi Chính Thức Cho Bệnh Nhân
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleResponseSubmit}>
          <Modal.Body className="pt-3">
            {selectedFeedback && (
              <div className="p-3 bg-light rounded-3 mb-3">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <strong className="text-dark">{selectedFeedback.patientName}</strong>
                  <div className="d-flex align-items-center gap-1">
                    {renderStars(selectedFeedback.rating)}
                  </div>
                </div>
                <div className="fw-semibold text-primary">{selectedFeedback.title}</div>
                <div className="text-secondary small mt-1">{selectedFeedback.comment}</div>
              </div>
            )}
            <Form.Group>
              <Form.Label className="small fw-semibold">Nội dung phản hồi từ Ban Quản Lý</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                required
                placeholder="Viết thư cảm ơn hoặc giải trình biện pháp khắc phục của phòng khám..."
                value={responseForm.response}
                onChange={(e) => setResponseForm({ ...responseForm, response: e.target.value })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-0">
            <Button variant="secondary" onClick={() => setShowResponseModal(false)}>Hủy</Button>
            <Button variant="success" type="submit" disabled={submitting}>
              {submitting ? 'Đang gửi...' : 'Gửi phản hồi cho bệnh nhân'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal (Admin only) */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold text-danger d-flex align-items-center gap-2">
            <FaTrashAlt />
            Xác Nhận Xóa Đánh Giá (Admin)
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          Bạn có chắc chắn muốn xóa đánh giá <strong>"{selectedFeedback?.title}"</strong> này không?
          <div className="alert alert-warning mt-3 mb-0 small">
            Thao tác này chỉ dành riêng cho Admin. Đánh giá sẽ được lưu lại với trạng thái <strong>"Feedback đã bị admin xóa"</strong> để phục vụ truy vết kiểm toán.
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Hủy</Button>
          <Button variant="danger" onClick={handleDeleteSubmit} disabled={submitting}>
            {submitting ? 'Đang xóa...' : 'Xác nhận xóa'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default FeedbackHubPage;
