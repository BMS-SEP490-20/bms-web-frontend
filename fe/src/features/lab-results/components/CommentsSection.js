/**
 * CommentsSection Component
 * 
 * Thêm component này vào ResultsDashboardPage.jsx để hiển thị và quản lý comments
 * cho mỗi đơn xét nghiệm (test order)
 */

import React, { useState, useEffect } from 'react';
import { Card, Form, Button, ListGroup, Badge, Spinner } from 'react-bootstrap';
import testOrderService from '../../services/testOrderService';

const CommentsSection = ({ appointmentId, user, onError, onSuccess }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load comments when appointmentId changes
  useEffect(() => {
    if (appointmentId) {
      loadComments();
    }
  }, [appointmentId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const result = await testOrderService.getTestOrderCommentsByAppointment(appointmentId);
      
      if (result.success) {
        // Sort comments by createdAt (newest first)
        const sortedComments = (result.data || []).sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        setComments(sortedComments);
      } else {
        setComments([]);
      }
    } catch (error) {
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      if (onError) onError('Vui lòng nhập nội dung ghi chú');
      return;
    }

    try {
      setSubmitting(true);
      
      const payload = {
        appointmentId: appointmentId,
        userId: user?.id || user?.userId,
        userName: user?.fullName || user?.name || 'Unknown User',
        comment: newComment.trim(),
        createdAt: new Date().toISOString()
      };

      const result = await testOrderService.createTestOrderComment(payload);
      
      if (result.success) {
        await loadComments();
        setNewComment('');
        if (onSuccess) onSuccess('Thêm ghi chú thành công');
      } else {
        if (onError) onError('Lỗi khi thêm ghi chú: ' + result.message);
      }
    } catch (error) {
      if (onError) onError('Lỗi khi thêm ghi chú: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    const confirmed = window.confirm('Bạn có chắc chắn muốn xóa ghi chú này?');
    if (!confirmed) return;

    try {
      const result = await testOrderService.deleteTestOrderComment(commentId);
      
      if (result.success) {
        await loadComments();
        if (onSuccess) onSuccess('Xóa ghi chú thành công');
      } else {
        if (onError) onError('Lỗi khi xóa ghi chú: ' + result.message);
      }
    } catch (error) {
      if (onError) onError('Lỗi khi xóa ghi chú: ' + error.message);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <Card className="mt-3">
      <Card.Header>
        <strong>📝 Ghi Chú Đơn Xét Nghiệm</strong>
        {comments.length > 0 && (
          <Badge bg="info" className="ms-2">{comments.length}</Badge>
        )}
      </Card.Header>
      <Card.Body>
        {/* Add Comment Form */}
        <Form.Group className="mb-3">
          <Form.Label>Thêm ghi chú mới:</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Nhập nội dung ghi chú..."
            disabled={submitting}
          />
          <div className="mt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleAddComment}
              disabled={submitting || !newComment.trim()}
            >
              {submitting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-1" />
                  Đang thêm...
                </>
              ) : (
                '➕ Thêm Ghi Chú'
              )}
            </Button>
          </div>
        </Form.Group>

        {/* Comments List */}
        <div className="comments-list">
          <strong className="d-block mb-2">Lịch sử ghi chú:</strong>
          
          {loading ? (
            <div className="text-center py-3">
              <Spinner animation="border" size="sm" />
              <span className="ms-2">Đang tải...</span>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-muted text-center py-3">
              Chưa có ghi chú nào
            </div>
          ) : (
            <ListGroup>
              {comments.map((comment, index) => (
                <ListGroup.Item key={comment.id || index}>
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <div className="mb-1">
                        <strong className="text-primary">
                          {comment.userName || 'Unknown User'}
                        </strong>
                        <small className="text-muted ms-2">
                          {formatDate(comment.createdAt)}
                        </small>
                      </div>
                      <div className="comment-text">
                        {comment.comment}
                      </div>
                    </div>
                    
                    {/* Delete button - only show if current user is the author */}
                    {(user?.id === comment.userId || user?.userId === comment.userId) && (
                      <Button
                        variant="link"
                        size="sm"
                        className="text-danger p-0 ms-2"
                        onClick={() => handleDeleteComment(comment.id)}
                        title="Xóa ghi chú"
                      >
                        🗑️
                      </Button>
                    )}
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default CommentsSection;

// =====================================================
// INTEGRATION INSTRUCTIONS
// =====================================================

/**
 * How to integrate this component into ResultsDashboardPage.jsx:
 * 
 * 1. Import the component:
 *    import CommentsSection from './CommentsSection';
 * 
 * 2. Add it to the modal content (inside the Modal.Body):
 *    <Modal show={showModal} onHide={() => setShowModal(false)} size="xl">
 *      <Modal.Header closeButton>
 *        <Modal.Title>Chi Tiết Kết Quả Xét Nghiệm</Modal.Title>
 *      </Modal.Header>
 *      <Modal.Body>
 *        {/* Existing result parameters table *\/}
 *        ...
 *        
 *        {/* Add Comments Section here *\/}
 *        {selectedTest && selectedTest.appointmentId && (
 *          <CommentsSection
 *            appointmentId={selectedTest.appointmentId}
 *            user={user}
 *            onError={showError}
 *            onSuccess={showSuccess}
 *          />
 *        )}
 *      </Modal.Body>
 *      <Modal.Footer>
 *        ...
 *      </Modal.Footer>
 *    </Modal>
 * 
 * 3. Make sure you have showError and showSuccess functions in your component:
 *    const showError = (message) => {
 *      // Your error notification logic
 *      alert(message); // or use toast/notification library
 *    };
 *    
 *    const showSuccess = (message) => {
 *      // Your success notification logic
 *      alert(message); // or use toast/notification library
 *    };
 */

// =====================================================
// STYLING (Optional - add to your CSS file)
// =====================================================

/**
 * .comments-section {
 *   margin-top: 1rem;
 *   padding: 1rem;
 *   background-color: #f8f9fa;
 *   border-radius: 8px;
 * }
 * 
 * .comments-list {
 *   max-height: 400px;
 *   overflow-y: auto;
 * }
 * 
 * .comment-text {
 *   white-space: pre-wrap;
 *   word-break: break-word;
 *   line-height: 1.5;
 * }
 * 
 * .list-group-item {
 *   border-left: 3px solid #0d6efd;
 * }
 */
