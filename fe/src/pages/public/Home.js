/**
 * Home Page Component
 * 
 * The main landing page of the Blood Laboratory Management System.
 * Features a modern, responsive design with animated sections showcasing
 * services, features, and call-to-action elements for user engagement.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Badge, Carousel } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import GuestHeader from '../../components/Layout/GuestHeader';
import GuestFooter from '../../components/Layout/GuestFooter';
import Loading from '../../shared/components/Loading/Loading';
import { motion, useAnimation, useInView } from 'framer-motion';
import { useSpring, animated, useTrail } from 'react-spring';
import AOS from 'aos';
import 'aos/dist/aos.css';
import '../../shared/styles/animations.css';
import LazyLoad from 'react-lazyload';
import { medicalService } from '../../services/medicalService';
// import backgroundImage from '../../assets/ảnh nền quy trình y tế.jpg';
import background2 from '../../assets/background2.jpg';
import useResponsive from '../../shared/hooks/useResponsive';

/**
 * Home Component
 * 
 * Main landing page component with animated sections and service showcase.
 * Includes hero section, services overview, features, and testimonials.
 * 
 * @returns {React.ReactNode} Home page component
 */
const Home = () => {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState([]);

  // Mảng ảnh card để sử dụng cho các dịch vụ
  const cardImages = [
    require('../../assets/card1.jpg'),
    require('../../assets/card2.jpg'),
    require('../../assets/card3.jpg'),
    require('../../assets/card4.jpg'),
    require('../../assets/card5.jpg'),
    require('../../assets/card6.jpg')
  ];

  /**
   * Effect hook: Loads services from API on component mount
   * 
   * This effect automatically loads medical services from the API when the component
   * mounts. It filters for active services and formats them for display.
   * 
   * @effect
   * @dependencies [] - Runs only once on mount
   * 
   * @example
   * // Automatically loads services on mount
   * useEffect(() => {
   *   const loadServices = async () => {
   *     // Load services...
   *   };
   *   loadServices();
   * }, []);
   */
  useEffect(() => {
    // Load services from API
    const loadServices = async () => {
      try {
        const servicesResp = await medicalService.getAllServices({ fetchAll: false });
        if (servicesResp.success && servicesResp.data) {
          // Lấy tối đa 6 gói dịch vụ Active đầu tiên để hiển thị
          const activeServices = servicesResp.data
            .filter(s => {
              const status = s.Status || s.status || '';
              return status.toLowerCase() === 'active' || status === '';
            })
            .slice(0, 6) // Lấy 6 gói đầu tiên
            .map((s, index) => {
              // Format price từ DB (400000.00) sang VND format (400,000 ₫)
              const price = s.Price || s.price || 0;
              const formattedPrice = new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              }).format(price);

              // Map icon và color dựa trên tên dịch vụ hoặc index
              const getIconAndColor = (name, idx) => {
                const nameLower = String(name || '').toLowerCase();
                if (nameLower.includes('máu') || nameLower.includes('blood')) {
                  return { icon: 'fas fa-tint', color: 'primary' };
                } else if (nameLower.includes('gan') || nameLower.includes('liver')) {
                  return { icon: 'fas fa-liver', color: 'primary' };
                } else if (nameLower.includes('thận') || nameLower.includes('kidney')) {
                  return { icon: 'fas fa-kidneys', color: 'primary' };
                } else if (nameLower.includes('hormone')) {
                  return { icon: 'fas fa-dna', color: 'warning' };
                } else if (nameLower.includes('miễn dịch') || nameLower.includes('immune')) {
                  return { icon: 'fas fa-shield-alt', color: 'danger' };
                } else if (nameLower.includes('covid')) {
                  return { icon: 'fas fa-virus', color: 'secondary' };
                }
                // Default
                const colors = ['primary', 'success', 'info', 'warning', 'danger', 'secondary'];
                return { icon: 'fas fa-heartbeat', color: colors[idx % 6] };
              };

              const { icon, color } = getIconAndColor(s.PackageName || s.packageName || s.name, index);

              return {
                id: s.PackageId || s.packageId || s.id || `service-${index}`,
                name: s.PackageName || s.packageName || s.name || 'Xét nghiệm',
                description: s.Description || s.description || 'Mô tả dịch vụ xét nghiệm',
                icon: icon,
                color: color,
                price: formattedPrice
              };
            });

          setServices(activeServices);
        } else {
          // Fallback to default services if API fails
          setServices([
            {
              id: 1,
              name: 'Xét nghiệm máu cơ bản',
              description: 'Công thức máu, đường huyết, cholesterol',
              icon: 'fas fa-tint',
              color: 'primary',
              price: '150,000 VNĐ'
            },
            {
              id: 2,
              name: 'Xét nghiệm chức năng gan',
              description: 'AST, ALT, Bilirubin, Albumin',
              icon: 'fas fa-liver',
              color: 'primary',
              price: '200,000 VNĐ'
            },
            {
              id: 3,
              name: 'Xét nghiệm chức năng thận',
              description: 'Creatinine, Urea, Uric acid',
              icon: 'fas fa-kidneys',
              color: 'primary',
              price: '180,000 VNĐ'
            },
            {
              id: 4,
              name: 'Xét nghiệm hormone',
              description: 'TSH, T3, T4, Testosterone, Estrogen',
              icon: 'fas fa-dna',
              color: 'warning',
              price: '300,000 VNĐ'
            },
            {
              id: 5,
              name: 'Xét nghiệm miễn dịch',
              description: 'CRP, RF, ANA, Anti-CCP',
              icon: 'fas fa-shield-alt',
              color: 'danger',
              price: '250,000 VNĐ'
            },
            {
              id: 6,
              name: 'Xét nghiệm nhanh COVID-19',
              description: 'Test nhanh kháng nguyên COVID-19',
              icon: 'fas fa-virus',
              color: 'secondary',
              price: '100,000 VNĐ'
            }
          ]);
        }
      } catch (error) {
        // Fallback to default services on error
        setServices([
          {
            id: 1,
            name: 'Xét nghiệm máu cơ bản',
            description: 'Công thức máu, đường huyết, cholesterol',
            icon: 'fas fa-tint',
            color: 'primary',
            price: '150,000 VNĐ'
          },
          {
            id: 2,
            name: 'Xét nghiệm chức năng gan',
            description: 'AST, ALT, Bilirubin, Albumin',
            icon: 'fas fa-liver',
            color: 'primary',
            price: '200,000 VNĐ'
          },
          {
            id: 3,
            name: 'Xét nghiệm chức năng thận',
            description: 'Creatinine, Urea, Uric acid',
            icon: 'fas fa-kidneys',
            color: 'primary',
            price: '180,000 VNĐ'
          },
          {
            id: 4,
            name: 'Xét nghiệm hormone',
            description: 'TSH, T3, T4, Testosterone, Estrogen',
            icon: 'fas fa-dna',
            color: 'warning',
            price: '300,000 VNĐ'
          },
          {
            id: 5,
            name: 'Xét nghiệm miễn dịch',
            description: 'CRP, RF, ANA, Anti-CCP',
            icon: 'fas fa-shield-alt',
            color: 'danger',
            price: '250,000 VNĐ'
          },
          {
            id: 6,
            name: 'Xét nghiệm nhanh COVID-19',
            description: 'Test nhanh kháng nguyên COVID-19',
            icon: 'fas fa-virus',
            color: 'secondary',
            price: '100,000 VNĐ'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadServices();

    AOS.init({
      duration: 1000,
      once: true,
      offset: 100
    });
  }, []);

  // const handleLogin = () => {
  //   navigate('/login');
  // };

  // const handleRegister = () => {
  //   navigate('/register');
  // };

  /**
   * Handles service selection for navigation
   * 
   * This function is called when user clicks on a service card. It navigates
   * to the patient dashboard with the selected service name, allowing the
   * user to book an appointment for that service.
   * 
   * @param {string} serviceName - Name of the selected service
   * @returns {void} Does not return a value. Navigates to patient dashboard.
   * 
   * @example
   * // Select a service to book
   * handleServiceSelect('Gói xét nghiệm tổng quát');
   */
  const handleServiceSelect = (serviceName) => {
    // Lưu dịch vụ được chọn vào localStorage để sử dụng sau khi đăng nhập
    localStorage.setItem('selectedService', serviceName);
    navigate('/login');
  };

  // Banner images data
  const bannerImages = [
    {
      id: 1,
      image: require('../../assets/banner1.jpg'),
      title: 'Xét nghiệm máu chính xác',
      subtitle: 'Công nghệ hiện đại, kết quả nhanh chóng',
      description: 'Phòng xét nghiệm máu với trang thiết bị hiện đại, đội ngũ bác sĩ giàu kinh nghiệm',
      buttonText: 'Đặt lịch ngay',
      buttonAction: () => navigate('/login')
    },
    {
      id: 2,
      image: require('../../assets/banner2.jpg'),
      title: 'Chăm sóc sức khỏe toàn diện',
      subtitle: 'Từ xét nghiệm đến tư vấn y tế',
      description: 'Dịch vụ y tế hoàn chỉnh với các gói xét nghiệm đa dạng, phù hợp mọi nhu cầu',
      buttonText: 'Tìm hiểu thêm',
      buttonAction: () => navigate('/login')
    },
    {
      id: 3,
      image: require('../../assets/banner3.jpg'),
      title: 'Kết quả nhanh, chính xác',
      subtitle: 'Trong 2-4 giờ có kết quả',
      description: 'Hệ thống xử lý tự động, báo cáo chi tiết và tư vấn từ bác sĩ chuyên khoa',
      buttonText: 'Xem dịch vụ',
      buttonAction: () => navigate('/login')
    }
  ];



  // Show loading only if services haven't loaded yet
  if (loading && services.length === 0) {
    return <Loading message="Đang tải trang chủ..." fullScreen={true} />;
  }

  return (
    <div className="min-h-screen">
      <GuestHeader />

      {/* Hero Banner Carousel */}
      <motion.section 
        className="hero-banner"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <Carousel 
          activeIndex={currentSlide} 
          onSelect={setCurrentSlide}
          interval={5000}
          fade
        >
          {bannerImages.map((banner) => (
            <Carousel.Item key={banner.id}>
              <div 
                className="hero-slide"
                      style={{
                        backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${banner.image})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        minHeight: 'clamp(500px, 100vh, 700px)',
                        display: 'flex',
                        alignItems: 'center',
                        padding: 'clamp(2rem, 5vw, 4rem) 0'
                      }}
              >
                <Container>
                  <Row className="align-items-center text-white">
                    {/* Text Content - Responsive */}
                    <Col xs={12} md={6} lg={6} className="order-2 order-md-1">
                      <motion.h1 
                        className="fw-bold mb-3 mb-md-4"
                        style={{
                          fontSize: 'clamp(1.5rem, 4vw, 3rem)',
                          lineHeight: '1.2'
                        }}
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                      >
                        {banner.title}
                      </motion.h1>
                      <motion.h3 
                        className="mb-3 mb-md-4 text-light"
                        style={{
                          fontSize: 'clamp(1rem, 2.5vw, 1.5rem)',
                          lineHeight: '1.3'
                        }}
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                      >
                        {banner.subtitle}
                      </motion.h3>
                      <motion.p 
                        className="mb-3 mb-md-4 lead"
                        style={{ 
                          fontSize: 'clamp(0.9rem, 2vw, 1.25rem)',
                          lineHeight: '1.5'
                        }}
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                      >
                        {banner.description}
                      </motion.p>
                      <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.8 }}
                      >
                        <Button 
                          variant="primary" 
                          size="lg" 
                          onClick={banner.buttonAction}
                          className="px-3 px-md-4"
                          style={{
                            background: '#0d6efd',
                            border: 'none',
                            color: '#333333',
                            fontWeight: '600',
                            boxShadow: '0 8px 20px rgba(13, 110, 253, 0.3)',
                            transition: 'all 0.3s ease',
                            fontSize: 'clamp(0.8rem, 1.5vw, 1rem)',
                            padding: 'clamp(8px, 2vw, 12px) clamp(16px, 4vw, 24px)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.boxShadow = '0 12px 25px rgba(13, 110, 253, 0.4)';
                            e.currentTarget.style.background = '#0b5ed7';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 8px 20px rgba(13, 110, 253, 0.3)';
                            e.currentTarget.style.background = '#0d6efd';
                          }}
                        >
                          <i className="fas fa-info-circle me-2"></i>
                          Tìm hiểu thêm
                        </Button>
                      </motion.div>
                    </Col>
                    
                    {/* Image Content - Responsive */}
                    <Col xs={12} md={6} lg={6} className="text-center order-1 order-md-2 mb-4 mb-md-0">
                      <motion.div 
                        className="hero-image-container"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                      >
                        <img 
                          src={banner.image} 
                          alt={banner.title}
                          className="img-fluid"
                          style={{ 
                            width: '100%',
                            maxWidth: 'clamp(500px, 60vw, 900px)',
                            height: 'auto',
                            aspectRatio: '4/3',
                            objectFit: 'cover',
                            borderRadius: '20px',
                            boxShadow: '0 15px 35px rgba(0,0,0,0.3)',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.05)';
                            e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = '0 15px 35px rgba(0,0,0,0.3)';
                          }}
                        />
                      </motion.div>
                    </Col>
                  </Row>
                </Container>
              </div>
            </Carousel.Item>
          ))}
        </Carousel>
      </motion.section>


      {/* Services Section */}
      <motion.section 
        id="services" 
        className="services-section py-5" 
        style={{ 
          background: 'linear-gradient(135deg, rgba(13, 110, 253, 0.1) 0%, rgba(13, 110, 253, 0.05) 100%)',
          position: 'relative',
          minHeight: '100vh',
          padding: '6rem 0'
        }}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
      >
                    {/* Background Image */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundImage: 'url(' + require('../../assets/background1.png') + ')',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      opacity: 0.3,
                      zIndex: 0
                    }}></div>
                    <Container style={{ position: 'relative', zIndex: 1 }}>
          <Row className="text-center mb-5">
            <Col>
                          <motion.div 
                            className="medical-section-header" 
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ 
                              duration: 0.6, 
                              delay: 0.2,
                              ease: "easeOut"
                            }}
                            style={{
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(240,248,255,0.95) 100%)',
                            borderRadius: '20px',
                            padding: '3rem 2rem',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                            border: '2px solid rgba(13, 110, 253, 0.2)',
                            position: 'relative',
                            overflow: 'hidden'
                          }}>
                            <div className="medical-icon-bg" style={{
                              position: 'absolute',
                              top: '-20px',
                              right: '-20px',
                              fontSize: '8rem',
                              color: 'rgba(13, 110, 253, 0.1)',
                              zIndex: 1
                            }}>
                              <i className="fas fa-stethoscope"></i>
                            </div>
                            <div style={{ position: 'relative', zIndex: 2 }}>
                              <h2 className="display-5 fw-bold text-primary mb-3" style={{
                                background: 'linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                textShadow: '0 4px 8px rgba(13, 110, 253, 0.3)'
                              }}>
                                <i className="fas fa-flask me-3" style={{ 
                                  background: 'linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)',
                                  WebkitBackgroundClip: 'text',
                                  WebkitTextFillColor: 'transparent',
                                  backgroundClip: 'text'
                                }}></i>
                                Dịch vụ xét nghiệm
              </h2>
                              <p className="lead text-muted mb-4" style={{ fontSize: '1.2rem', fontWeight: '500' }}>
                                Chúng tôi cung cấp đầy đủ các loại xét nghiệm máu với độ chính xác cao
                              </p>
                              <motion.div 
                                className="medical-stats" 
                                style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ 
                                  duration: 0.5, 
                                  delay: 0.6,
                                  ease: "easeOut"
                                }}
                              >
                                <motion.div 
                                  className="stat-item"
                                  initial={{ opacity: 0, y: 15 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ 
                                    duration: 0.4, 
                                    delay: 0.8,
                                    ease: "easeOut"
                                  }}
                                  whileHover={{ 
                                    scale: 1.05,
                                    y: -5,
                                    transition: { duration: 0.2 }
                                  }}
                                >
                                  <div style={{ fontSize: '2rem', color: '#0d6efd', fontWeight: 'bold' }}>99.9%</div>
                                  <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>Độ chính xác</div>
                                </motion.div>
                                <motion.div 
                                  className="stat-item"
                                  initial={{ opacity: 0, y: 15 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ 
                                    duration: 0.4, 
                                    delay: 1.0,
                                    ease: "easeOut"
                                  }}
                                  whileHover={{ 
                                    scale: 1.05,
                                    y: -5,
                                    transition: { duration: 0.2 }
                                  }}
                                >
                                  <div style={{ fontSize: '2rem', color: '#0d6efd', fontWeight: 'bold' }}>2-4h</div>
                                  <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>Thời gian</div>
                                </motion.div>
                                <motion.div 
                                  className="stat-item"
                                  initial={{ opacity: 0, y: 15 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ 
                                    duration: 0.4, 
                                    delay: 1.2,
                                    ease: "easeOut"
                                  }}
                                  whileHover={{ 
                                    scale: 1.05,
                                    y: -5,
                                    transition: { duration: 0.2 }
                                  }}
                                >
                                  <div style={{ fontSize: '2rem', color: '#0d6efd', fontWeight: 'bold' }}>24/7</div>
                                  <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>Hỗ trợ</div>
                                </motion.div>
                              </motion.div>
                            </div>
                          </motion.div>
            </Col>
          </Row>
          
          <Row className="g-4">
            {services.map((service, index) => (
              <Col lg={4} md={6} xs={12} key={service.id}>
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ 
                                duration: 0.5, 
                                delay: index * 0.2,
                                type: "spring",
                                stiffness: 100,
                                damping: 15
                              }}
                              whileHover={{ 
                                y: -10, 
                                scale: 1.05,
                                transition: { duration: 0.2 }
                              }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Card 
                                className="h-100 service-card border-0"
                                style={{
                                  background: 'linear-gradient(135deg, rgba(13, 110, 253, 0.1) 0%, rgba(13, 110, 253, 0.05) 100%)',
                                  borderRadius: '20px',
                                  boxShadow: '0 10px 30px rgba(13, 110, 253, 0.2)',
                                  border: '3px solid rgba(13, 110, 253, 0.2)',
                                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                  position: 'relative',
                                  overflow: 'hidden'
                                }}
                               onMouseEnter={(e) => {
                                 e.currentTarget.style.transform = 'translateY(-15px) scale(1.02) rotate(2deg)';
                                 e.currentTarget.style.boxShadow = '0 25px 50px rgba(13, 110, 253, 0.4)';
                                 e.currentTarget.style.border = '3px solid rgba(13, 110, 253, 0.4)';
                               }}
                               onMouseLeave={(e) => {
                                 e.currentTarget.style.transform = 'translateY(0) scale(1) rotate(0deg)';
                                 e.currentTarget.style.boxShadow = '0 10px 30px rgba(13, 110, 253, 0.2)';
                                 e.currentTarget.style.border = '3px solid rgba(13, 110, 253, 0.2)';
                               }}
                            >
                              <Card.Body className="text-center p-4">
                                <div className="service-image mb-3" style={{
                                  width: 'calc(100% + 12px)',
                                  height: '280px',
                                  borderRadius: '15px',
                                  overflow: 'hidden',
                                  marginBottom: '1rem',
                                  marginLeft: '-6px',
                                  marginTop: '-6px',
                                  position: 'relative',
                                  zIndex: 1
                                }}>
                                  <motion.img 
                                    src={cardImages[index % cardImages.length]}
                                    alt={service.name}
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover'
                                    }}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ 
                                      duration: 0.4, 
                                      delay: index * 0.2 + 0.3,
                                      ease: "easeOut"
                                    }}
                                    whileHover={{ 
                                      scale: 1.08,
                                      transition: { duration: 0.2 }
                                    }}
                                  />
                  </div>
                    
                                <div className="medical-service-info">
                                  <h5 className="fw-bold mb-3" style={{
                                    color: '#0d6efd',
                                    fontSize: '1.3rem',
                                    textShadow: '0 2px 4px rgba(13, 110, 253, 0.2)'
                                  }}>
                                    <i className="fas fa-heartbeat me-2" style={{ color: '#dc3545' }}></i>
                                    {service.name}
                                  </h5>
                                  <p className="text-muted mb-3" style={{ 
                                    fontSize: '1rem', 
                                    lineHeight: '1.6',
                                    color: '#6c757d'
                                  }}>
                                    {service.description}
                                  </p>
                                  
                                  <motion.div 
                                    className="medical-badge mb-3" 
                                    style={{
                                      background: '#0d6efd',
                                      color: '#333333',
                                      padding: '4px 12px',
                                      borderRadius: '25px',
                                      fontSize: '0.85rem',
                                      fontWeight: '600',
                                      boxShadow: '0 3px 10px rgba(13, 110, 253, 0.3)',
                                      display: 'inline-block'
                                    }}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ 
                                      duration: 0.3, 
                                      delay: index * 0.2 + 0.5,
                                      ease: "easeOut"
                                    }}
                                    whileHover={{ 
                                      scale: 1.05,
                                      y: -2,
                                      transition: { duration: 0.2 }
                                    }}
                                  >
                                    {service.price}
                                  </motion.div>
                                  
                                  <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ 
                                      duration: 0.4, 
                                      delay: index * 0.2 + 0.7,
                                      ease: "easeOut"
                                    }}
                                    whileHover={{ 
                                      y: -3,
                                      transition: { duration: 0.2 }
                                    }}
                                  >
                      <Button 
                        variant="primary" 
                                      className="w-100 medical-btn"
                                      onClick={() => handleServiceSelect(service.name)}
                                      style={{
                                        background: 'linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)',
                                        border: 'none',
                                        borderRadius: '25px',
                                        padding: '12px 24px',
                                        fontWeight: '600',
                                        fontSize: '1rem',
                                        boxShadow: '0 8px 20px rgba(13, 110, 253, 0.3)',
                                        transition: 'all 0.3s ease',
                                        position: 'relative',
                                        overflow: 'hidden'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 12px 25px rgba(13, 110, 253, 0.4)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(13, 110, 253, 0.3)';
                                      }}
                                    >
                                    <i className="fas fa-calendar-plus me-2"></i>
                                    Đặt lịch xét nghiệm
                      </Button>
                                  </motion.div>
                    </div>
                  </Card.Body>
                </Card>
                            </motion.div>
              </Col>
            ))}
          </Row>
        </Container>
      </motion.section>


      {/* About Section */}
      <LazyLoad height={800} offset={100}>
        <section id="about" className="py-5" style={{ 
        position: 'relative',
        minHeight: '100vh',
        padding: '8rem 0',
        backgroundImage: `url(${background2})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'scroll',
        backgroundRepeat: 'no-repeat'
      }}>
        <Container style={{ position: 'relative', zIndex: 2 }}>
          <Row className="align-items-center">
            <Col lg={5} style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '25px',
              padding: '40px',
              boxShadow: '0 15px 40px rgba(0,0,0,0.2)',
              backdropFilter: 'blur(10px)'
            }}>
              <h2 className="display-6 fw-bold text-primary mb-4">
                <i className="fas fa-star me-3"></i>
                Tại sao chọn chúng tôi?
              </h2>
              <div className="row">
                <div className="col-6 mb-4">
                  <div className="text-center p-3 rounded"
                       style={{ 
                         backgroundColor: 'rgba(13, 110, 253, 0.1)',
                         border: '2px solid rgba(13, 110, 253, 0.2)',
                         transition: 'all 0.3s ease'
                       }}
                       onMouseEnter={(e) => {
                         e.currentTarget.style.backgroundColor = 'rgba(13, 110, 253, 0.2)';
                         e.currentTarget.style.transform = 'scale(1.05)';
                       }}
                       onMouseLeave={(e) => {
                         e.currentTarget.style.backgroundColor = 'rgba(13, 110, 253, 0.1)';
                         e.currentTarget.style.transform = 'scale(1)';
                       }}>
                    <img 
                      src={require('../../assets/quality.png')} 
                      alt="Chất lượng cao"
                      style={{
                        width: '120px',
                        height: '120px',
                        objectFit: 'cover',
                        borderRadius: '50%',
                        marginBottom: '1rem',
                        boxShadow: '0 12px 30px rgba(13, 110, 253, 0.4)',
                        transition: 'all 0.3s ease',
                        border: '3px solid rgba(13, 110, 253, 0.3)',
                        transform: 'translateY(-10px)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)';
                        e.currentTarget.style.boxShadow = '0 12px 25px rgba(13, 110, 253, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(13, 110, 253, 0.3)';
                      }}
                    />
                    <h6 className="fw-bold">Chất lượng cao</h6>
                    <p className="small text-muted">Độ chính xác 99.9%</p>
                  </div>
                </div>
                <div className="col-6 mb-4">
                  <div className="text-center p-3 rounded"
                       style={{ 
                         backgroundColor: 'rgba(25, 135, 84, 0.1)',
                         border: '2px solid rgba(13, 110, 253, 0.2)',
                         transition: 'all 0.3s ease'
                       }}
                       onMouseEnter={(e) => {
                         e.currentTarget.style.backgroundColor = 'rgba(25, 135, 84, 0.2)';
                         e.currentTarget.style.transform = 'scale(1.05)';
                       }}
                       onMouseLeave={(e) => {
                         e.currentTarget.style.backgroundColor = 'rgba(25, 135, 84, 0.1)';
                         e.currentTarget.style.transform = 'scale(1)';
                       }}>
                    <img 
                      src={require('../../assets/fast-result.png')} 
                      alt="Kết quả nhanh"
                      style={{
                        width: '120px',
                        height: '120px',
                        objectFit: 'cover',
                        borderRadius: '50%',
                        marginBottom: '1rem',
                        boxShadow: '0 12px 30px rgba(25, 135, 84, 0.4)',
                        transition: 'all 0.3s ease',
                        border: '3px solid rgba(13, 110, 253, 0.3)',
                        transform: 'translateY(-10px)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)';
                        e.currentTarget.style.boxShadow = '0 12px 25px rgba(25, 135, 84, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(25, 135, 84, 0.3)';
                      }}
                    />
                    <h6 className="fw-bold">Kết quả nhanh</h6>
                    <p className="small text-muted">Trong 2-4 giờ</p>
                  </div>
                </div>
                <div className="col-6 mb-4">
                  <div className="text-center p-3 rounded"
                       style={{ 
                         backgroundColor: 'rgba(13, 202, 240, 0.1)',
                         border: '2px solid rgba(13, 110, 253, 0.2)',
                         transition: 'all 0.3s ease'
                       }}
                       onMouseEnter={(e) => {
                         e.currentTarget.style.backgroundColor = 'rgba(13, 202, 240, 0.2)';
                         e.currentTarget.style.transform = 'scale(1.05)';
                       }}
                       onMouseLeave={(e) => {
                         e.currentTarget.style.backgroundColor = 'rgba(13, 202, 240, 0.1)';
                         e.currentTarget.style.transform = 'scale(1)';
                       }}>
                    <img 
                      src={require('../../assets/shield2.jpg')} 
                      alt="An toàn"
                      style={{
                        width: '120px',
                        height: '120px',
                        objectFit: 'cover',
                        borderRadius: '50%',
                        marginBottom: '1rem',
                        boxShadow: '0 12px 30px rgba(13, 202, 240, 0.4)',
                        transition: 'all 0.3s ease',
                        border: '3px solid rgba(13, 110, 253, 0.3)',
                        transform: 'translateY(-10px)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)';
                        e.currentTarget.style.boxShadow = '0 12px 25px rgba(13, 202, 240, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(13, 202, 240, 0.3)';
                      }}
                    />
                    <h6 className="fw-bold">An toàn</h6>
                    <p className="small text-muted">Quy trình chuẩn</p>
                  </div>
                </div>
                <div className="col-6 mb-4">
                  <div className="text-center p-3 rounded"
                       style={{ 
                         backgroundColor: 'rgba(255, 193, 7, 0.1)',
                         border: '2px solid rgba(13, 110, 253, 0.2)',
                         transition: 'all 0.3s ease'
                       }}
                       onMouseEnter={(e) => {
                         e.currentTarget.style.backgroundColor = 'rgba(255, 193, 7, 0.2)';
                         e.currentTarget.style.transform = 'scale(1.05)';
                       }}
                       onMouseLeave={(e) => {
                         e.currentTarget.style.backgroundColor = 'rgba(255, 193, 7, 0.1)';
                         e.currentTarget.style.transform = 'scale(1)';
                       }}>
                    <img 
                      src={require('../../assets/doctor1.jpg')} 
                      alt="Bác sĩ chuyên khoa"
                      style={{
                        width: '120px',
                        height: '120px',
                        objectFit: 'cover',
                        borderRadius: '50%',
                        marginBottom: '1rem',
                        boxShadow: '0 12px 30px rgba(255, 193, 7, 0.4)',
                        transition: 'all 0.3s ease',
                        border: '3px solid rgba(13, 110, 253, 0.3)',
                        transform: 'translateY(-10px)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)';
                        e.currentTarget.style.boxShadow = '0 12px 25px rgba(255, 193, 7, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(255, 193, 7, 0.3)';
                      }}
                    />
                    <h6 className="fw-bold">Bác sĩ chuyên khoa</h6>
                    <p className="small text-muted">Kinh nghiệm 10+ năm</p>
                  </div>
                </div>
              </div>
            </Col>
            <Col lg={7} className="text-center">
              <div className="about-image-container" style={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderRadius: '25px',
                padding: '30px',
                boxShadow: '0 15px 40px rgba(0,0,0,0.2)'
              }}>
                <Carousel 
                  interval={3000}
                  controls={true}
                  indicators={true}
                  fade={true}
                  style={{
                    borderRadius: '25px',
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
                    height: '500px',
                    width: '100%',
                    maxWidth: '100%'
                  }}
                >
                  <Carousel.Item>
                    <motion.img 
                      src={require('../../assets/ảnh nền quy trình y tế.jpg')} 
                      alt="Hero 1"
                      style={{
                        width: '100%',
                        height: '500px',
                        objectFit: 'cover'
                      }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                      whileHover={{ scale: 1.05 }}
                    />
                  </Carousel.Item>
                  <Carousel.Item>
                    <motion.img 
                      src={require('../../assets/Hero2.jpg')} 
                      alt="Hero 2"
                      style={{
                        width: '100%',
                        height: '500px',
                        objectFit: 'cover'
                      }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                      whileHover={{ scale: 1.05 }}
                    />
                  </Carousel.Item>
                  <Carousel.Item>
                    <motion.img 
                      src={require('../../assets/Hero3.jpg')} 
                      alt="Hero 3"
                      style={{
                        width: '100%',
                        height: '500px',
                        objectFit: 'cover'
                      }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                      whileHover={{ scale: 1.05 }}
                    />
                  </Carousel.Item>
                </Carousel>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
      </LazyLoad>

      {/* Testing Process Section */}
      <LazyLoad height={600} offset={100}>
        <motion.section 
          id="process" 
          className="py-5" 
          style={{ 
            background: `linear-gradient(135deg, rgba(13, 110, 253, 0.1) 0%, rgba(13, 110, 253, 0.05) 100%), url('/assets/ảnh nền quy trình y tế.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'scroll',
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#e3f2fd',
            position: 'relative',
            overflow: 'hidden',
            minHeight: '80vh',
            padding: '6rem 0'
          }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
        
        <Container style={{ position: 'relative', zIndex: 1 }}>
          <motion.div 
            className="text-center mb-5"
            style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '15px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
              margin: '0 1rem'
            }}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="display-4 fw-bold mb-4" style={{
              background: 'linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              <i className="fas fa-cogs me-3" style={{ color: '#0d6efd' }}></i>
              Quy trình xét nghiệm
            </h2>
            <p className="lead text-muted fs-5">
              Quy trình xét nghiệm chuyên nghiệp, đảm bảo kết quả chính xác và nhanh chóng
            </p>
          </motion.div>
          
          <Row className="g-4 justify-content-center">
            {[
              {
                id: 1,
                title: 'Đặt lịch hẹn',
                description: 'Đặt lịch hẹn trực tuyến hoặc qua điện thoại',
                icon: 'fas fa-calendar-plus',
                color: '#0d6efd',
                bgColor: 'rgba(13, 110, 253, 0.1)'
              },
              {
                id: 2,
                title: 'Lấy mẫu',
                description: 'Lấy mẫu máu theo quy trình chuẩn Bộ y tế',
                icon: 'fas fa-tint',
                color: '#dc3545',
                bgColor: 'rgba(220, 53, 69, 0.1)'
              },
              {
                id: 3,
                title: 'Xét nghiệm',
                description: 'Thực hiện xét nghiệm với thiết bị hiện đại',
                icon: 'fas fa-microscope',
                color: '#198754',
                bgColor: 'rgba(25, 135, 84, 0.1)'
              },
              {
                id: 4,
                title: 'Nhận kết quả',
                description: 'Nhận kết quả qua email hoặc tại phòng khám',
                icon: 'fas fa-file-medical',
                color: '#fd7e14',
                bgColor: 'rgba(253, 126, 20, 0.1)'
              }
            ].map((step, index) => (
              <Col lg={3} md={6} xs={12} key={step.id}>
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 0.6, 
                    delay: index * 0.2,
                    type: "spring",
                    stiffness: 100,
                    damping: 15
                  }}
                  whileHover={{ 
                    y: -15,
                    scale: 1.05,
                    transition: { duration: 0.3 }
                  }}
                  viewport={{ once: true }}
                >
                  <Card 
                    className="h-100 process-card border-0 position-relative"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 100%)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: '25px',
                      boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Step Number Badge */}
                    <div style={{
                      position: 'absolute',
                      top: '-15px',
                      right: '20px',
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${step.color} 0%, ${step.color}dd 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#333333',
                      fontSize: '1.2rem',
                      fontWeight: 'bold',
                      boxShadow: `0 8px 20px ${step.color}40`,
                      zIndex: 2
                    }}>
                      {step.id}
                    </div>

                    <Card.Body className="text-center p-5">
                      {/* Icon */}
                      <motion.div 
                        className="mb-4"
                        style={{
                          width: '100px',
                          height: '100px',
                          borderRadius: '50%',
                          background: step.bgColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto',
                          color: step.color,
                          fontSize: '2.5rem',
                          border: `3px solid ${step.color}20`
                        }}
                        whileHover={{ 
                          scale: 1.1,
                          rotate: 5,
                          transition: { duration: 0.3 }
                        }}
                      >
                        <i className={step.icon}></i>
                      </motion.div>
                      
                      {/* Content */}
                      <h4 className="fw-bold mb-3" style={{ color: step.color }}>
                        {step.title}
                      </h4>
                      <p className="text-muted mb-4" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                        {step.description}
                      </p>
                      
                      {/* Progress Indicator */}
                      <div style={{
                        width: '100%',
                        height: '4px',
                        background: 'rgba(0,0,0,0.1)',
                        borderRadius: '2px',
                        overflow: 'hidden'
                      }}>
                        <motion.div 
                          style={{
                            width: '100%',
                            height: '100%',
                            background: `linear-gradient(90deg, ${step.color} 0%, ${step.color}80 100%)`,
                            borderRadius: '2px'
                          }}
                          initial={{ width: '0%' }}
                          whileInView={{ width: '100%' }}
                          transition={{ 
                            duration: 1, 
                            delay: index * 0.3 + 0.5,
                            ease: "easeOut"
                          }}
                          viewport={{ once: true }}
                        />
                      </div>
                    </Card.Body>
                  </Card>
                </motion.div>
              </Col>
            ))}
          </Row>
          
          <motion.div 
            className="mt-5"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            viewport={{ once: true }}
          >
            <Row>
              <Col className="text-center">
                <div style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: '30px',
                  padding: '4rem 3rem',
                  border: '1px solid rgba(255,255,255,0.3)',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Background Pattern */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%230d6efd" fill-opacity="0.05"%3E%3Ccircle cx="20" cy="20" r="1"/%3E%3C/g%3E%3C/svg%3E")',
                    opacity: 0.5
                  }}></div>
                  
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <motion.h3 
                      className="fw-bold mb-4"
                      style={{
                        background: 'linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        fontSize: '2.5rem'
                      }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6, delay: 1 }}
                      viewport={{ once: true }}
                    >
                      <i className="fas fa-rocket me-3" style={{ color: '#0d6efd' }}></i>
                      Sẵn sàng bắt đầu?
                    </motion.h3>
                    
                    <motion.p 
                      className="lead text-muted mb-5 fs-5"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 1.2 }}
                      viewport={{ once: true }}
                    >
                      Đặt lịch hẹn ngay hôm nay để trải nghiệm dịch vụ xét nghiệm chuyên nghiệp
                    </motion.p>
                    
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 1.4 }}
                      viewport={{ once: true }}
                    >
                      <Button 
                        variant="primary" 
                        size="lg"
                        onClick={() => navigate('/login')}
                        style={{
                          background: 'linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)',
                          border: 'none',
                          borderRadius: '30px',
                          padding: '15px 40px',
                          fontWeight: '600',
                          fontSize: '1.1rem',
                          boxShadow: '0 10px 30px rgba(13, 110, 253, 0.4)',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-3px)';
                          e.currentTarget.style.boxShadow = '0 15px 40px rgba(13, 110, 253, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 10px 30px rgba(13, 110, 253, 0.4)';
                        }}
                      >
                        <i className="fas fa-calendar-plus me-2"></i>
                        Đặt lịch hẹn ngay
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </Col>
            </Row>
          </motion.div>
        </Container>
      </motion.section>
      </LazyLoad>


      {/* Testimonials Section */}
      <LazyLoad height={800} offset={100}>
        <motion.section 
          id="testimonials" 
          className="py-5" 
          style={{ 
            position: 'relative',
            minHeight: '100vh',
            padding: '8rem 0',
            background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #1e3c72 100%)',
            overflow: 'hidden'
          }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          {/* Background Pattern */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            zIndex: 1
          }}></div>
          
          <Container style={{ position: 'relative', zIndex: 2 }}>
            {/* Header */}
            <motion.div 
              className="text-center mb-5"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 
                className="display-4 fw-bold mb-4 text-white"
                style={{
                  textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                  background: 'linear-gradient(135deg, #ffffff 0%, #e3f2fd 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                <i className="fas fa-quote-left me-3" style={{ color: '#ff6b6b' }}></i>
                Khách hàng nói gì về chúng tôi
              </h2>
              <p 
                className="lead text-white mb-5"
                style={{ 
                  fontSize: '1.3rem',
                  opacity: 0.9,
                  textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
                }}
              >
                Hàng nghìn khách hàng đã tin tưởng và hài lòng với dịch vụ của chúng tôi
              </p>
            </motion.div>
            
            <Row className="g-4">
              <Col lg={4} md={6}>
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -15, scale: 1.02 }}
                >
                  <Card 
                    className="h-100 border-0"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 248, 255, 0.8) 100%)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: '25px',
                      border: '2px solid rgba(13, 110, 253, 0.2)',
                      boxShadow: '0 20px 40px rgba(13, 110, 253, 0.3)',
                      color: '#333333',
                      overflow: 'hidden',
                      position: 'relative'
                    }}
                  >
                    {/* Quote Icon */}
                    <div style={{
                      position: 'absolute',
                      top: '20px',
                      right: '20px',
                      fontSize: '3rem',
                      color: 'rgba(255,255,255,0.1)',
                      zIndex: 1
                    }}>
                      <i className="fas fa-quote-right"></i>
                    </div>
                    
                    <Card.Body className="p-5" style={{ position: 'relative', zIndex: 2 }}>
                      {/* Avatar */}
                      <div className="text-center mb-4">
                        <motion.div 
                          style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto',
                            boxShadow: '0 15px 30px rgba(13, 110, 253, 0.4)',
                            border: '4px solid rgba(255,255,255,0.3)'
                          }}
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ duration: 0.3 }}
                        >
                          <i className="fas fa-user" style={{ fontSize: '2rem', color: 'white' }}></i>
                        </motion.div>
                      </div>
                      
                      {/* Content */}
                      <div className="text-center">
                        <h5 className="fw-bold mb-2" style={{ fontSize: '1.3rem', color: '#333333' }}>
                          Nguyễn Văn A
                        </h5>
                        <p className="mb-4" style={{ 
                          opacity: 0.9, 
                          fontSize: '0.9rem',
                          background: 'rgba(13, 110, 253, 0.1)',
                          borderRadius: '15px',
                          padding: '5px 15px',
                          display: 'inline-block',
                          color: '#333333'
                        }}>
                          Khách hàng thường xuyên
                        </p>
                        
                        <blockquote className="mb-4" style={{ 
                          fontSize: '1.1rem',
                          lineHeight: '1.6',
                          fontStyle: 'italic',
                          opacity: 0.9,
                          color: '#333333'
                        }}>
                          "Dịch vụ xét nghiệm rất chuyên nghiệp, kết quả chính xác và nhanh chóng. 
                          Tôi rất hài lòng với chất lượng dịch vụ."
                        </blockquote>
                        
                        {/* Rating */}
                        <div className="d-flex justify-content-center mb-3">
                          {[...Array(5)].map((_, i) => (
                            <motion.i 
                              key={i}
                              className="fas fa-star text-warning me-1"
                              style={{ fontSize: '1.2rem' }}
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.1 }}
                            ></motion.i>
                          ))}
                        </div>
                        
                        {/* Verified Badge */}
                        <div style={{
                          background: 'rgba(13, 110, 253, 0.1)',
                          borderRadius: '20px',
                          padding: '8px 16px',
                          display: 'inline-block',
                          fontSize: '0.9rem',
                          color: '#333333'
                        }}>
                          <i className="fas fa-check-circle me-2" style={{ color: '#4ecdc4' }}></i>
                          Đã xác thực
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </motion.div>
              </Col>
              
              <Col lg={4} md={6}>
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -15, scale: 1.02 }}
                >
                  <Card 
                    className="h-100 border-0"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 248, 255, 0.8) 100%)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: '25px',
                      border: '2px solid rgba(13, 110, 253, 0.2)',
                      boxShadow: '0 20px 40px rgba(13, 110, 253, 0.3)',
                      color: '#333333',
                      overflow: 'hidden',
                      position: 'relative'
                    }}
                  >
                    {/* Quote Icon */}
                    <div style={{
                      position: 'absolute',
                      top: '20px',
                      right: '20px',
                      fontSize: '3rem',
                      color: 'rgba(255,255,255,0.1)',
                      zIndex: 1
                    }}>
                      <i className="fas fa-quote-right"></i>
                    </div>
                    
                    <Card.Body className="p-5" style={{ position: 'relative', zIndex: 2 }}>
                      {/* Avatar */}
                      <div className="text-center mb-4">
                        <motion.div 
                          style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #198754 0%, #20c997 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto',
                            boxShadow: '0 15px 30px rgba(25, 135, 84, 0.4)',
                            border: '4px solid rgba(255,255,255,0.3)'
                          }}
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ duration: 0.3 }}
                        >
                          <i className="fas fa-user" style={{ fontSize: '2rem', color: 'white' }}></i>
                        </motion.div>
                      </div>
                      
                      {/* Content */}
                      <div className="text-center">
                        <h5 className="fw-bold mb-2" style={{ fontSize: '1.3rem', color: '#333333' }}>
                          Trần Thị B
                        </h5>
                        <p className="mb-4" style={{ 
                          opacity: 0.9, 
                          fontSize: '0.9rem',
                          background: 'rgba(13, 110, 253, 0.1)',
                          borderRadius: '15px',
                          padding: '5px 15px',
                          display: 'inline-block',
                          color: '#333333'
                        }}>
                          Khách hàng mới
                        </p>
                        
                        <blockquote className="mb-4" style={{ 
                          fontSize: '1.1rem',
                          lineHeight: '1.6',
                          fontStyle: 'italic',
                          opacity: 0.9,
                          color: '#333333'
                        }}>
                          "Lần đầu sử dụng dịch vụ, tôi rất ấn tượng với sự chuyên nghiệp 
                          và tận tình của đội ngũ nhân viên."
                        </blockquote>
                        
                        {/* Rating */}
                        <div className="d-flex justify-content-center mb-3">
                          {[...Array(5)].map((_, i) => (
                            <motion.i 
                              key={i}
                              className="fas fa-star text-warning me-1"
                              style={{ fontSize: '1.2rem' }}
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.1 }}
                            ></motion.i>
                          ))}
                        </div>
                        
                        {/* Verified Badge */}
                        <div style={{
                          background: 'rgba(13, 110, 253, 0.1)',
                          borderRadius: '20px',
                          padding: '8px 16px',
                          display: 'inline-block',
                          fontSize: '0.9rem',
                          color: '#333333'
                        }}>
                          <i className="fas fa-check-circle me-2" style={{ color: '#4ecdc4' }}></i>
                          Đã xác thực
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </motion.div>
              </Col>
              
              <Col lg={4} md={6}>
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -15, scale: 1.02 }}
                >
                  <Card 
                    className="h-100 border-0"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 248, 255, 0.8) 100%)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: '25px',
                      border: '2px solid rgba(13, 110, 253, 0.2)',
                      boxShadow: '0 20px 40px rgba(13, 110, 253, 0.3)',
                      color: '#333333',
                      overflow: 'hidden',
                      position: 'relative'
                    }}
                  >
                    {/* Quote Icon */}
                    <div style={{
                      position: 'absolute',
                      top: '20px',
                      right: '20px',
                      fontSize: '3rem',
                      color: 'rgba(255,255,255,0.1)',
                      zIndex: 1
                    }}>
                      <i className="fas fa-quote-right"></i>
                    </div>
                    
                    <Card.Body className="p-5" style={{ position: 'relative', zIndex: 2 }}>
                      {/* Avatar */}
                      <div className="text-center mb-4">
                        <motion.div 
                          style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #fd7e14 0%, #ffc107 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto',
                            boxShadow: '0 15px 30px rgba(253, 126, 20, 0.4)',
                            border: '4px solid rgba(255,255,255,0.3)'
                          }}
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ duration: 0.3 }}
                        >
                          <i className="fas fa-user" style={{ fontSize: '2rem', color: 'white' }}></i>
                        </motion.div>
                      </div>
                      
                      {/* Content */}
                      <div className="text-center">
                        <h5 className="fw-bold mb-2" style={{ fontSize: '1.3rem', color: '#333333' }}>
                          Lê Văn C
                        </h5>
                        <p className="mb-4" style={{ 
                          opacity: 0.9, 
                          fontSize: '0.9rem',
                          background: 'rgba(13, 110, 253, 0.1)',
                          borderRadius: '15px',
                          padding: '5px 15px',
                          display: 'inline-block',
                          color: '#333333'
                        }}>
                          Khách hàng VIP
                        </p>
                        
                        <blockquote className="mb-4" style={{ 
                          fontSize: '1.1rem',
                          lineHeight: '1.6',
                          fontStyle: 'italic',
                          opacity: 0.9,
                          color: '#333333'
                        }}>
                          "Đã sử dụng dịch vụ nhiều năm, luôn hài lòng với chất lượng 
                          và thái độ phục vụ của phòng xét nghiệm."
                        </blockquote>
                        
                        {/* Rating */}
                        <div className="d-flex justify-content-center mb-3">
                          {[...Array(5)].map((_, i) => (
                            <motion.i 
                              key={i}
                              className="fas fa-star text-warning me-1"
                              style={{ fontSize: '1.2rem' }}
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.1 }}
                            ></motion.i>
                          ))}
                        </div>
                        
                        {/* Verified Badge */}
                        <div style={{
                          background: 'rgba(13, 110, 253, 0.1)',
                          borderRadius: '20px',
                          padding: '8px 16px',
                          display: 'inline-block',
                          fontSize: '0.9rem',
                          color: '#333333'
                        }}>
                          <i className="fas fa-check-circle me-2" style={{ color: '#4ecdc4' }}></i>
                          Đã xác thực
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </motion.div>
              </Col>
            </Row>
            
            {/* Statistics */}
            <motion.div 
              className="text-center mt-5"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              viewport={{ once: true }}
            >
              <div style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 248, 255, 0.8) 100%)',
                borderRadius: '30px',
                padding: '3rem 2rem',
                border: '2px solid rgba(13, 110, 253, 0.3)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 20px 40px rgba(13, 110, 253, 0.3)'
              }}>
                <Row className="g-4">
                  <Col md={3}>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6, delay: 0.6 }}
                      viewport={{ once: true }}
                    >
                      <h3 className="fw-bold mb-2" style={{ fontSize: '3rem', color: '#333333' }}>
                        <i className="fas fa-users me-2" style={{ color: '#ff6b6b' }}></i>
                        10,000+
                      </h3>
                      <p className="mb-0" style={{ opacity: 0.9, color: '#333333' }}>
                        Khách hàng tin tưởng
                      </p>
                    </motion.div>
                  </Col>
                  <Col md={3}>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6, delay: 0.7 }}
                      viewport={{ once: true }}
                    >
                      <h3 className="fw-bold mb-2" style={{ fontSize: '3rem', color: '#333333' }}>
                        <i className="fas fa-star me-2" style={{ color: '#ffc107' }}></i>
                        4.9/5
                      </h3>
                      <p className="mb-0" style={{ opacity: 0.9, color: '#333333' }}>
                        Đánh giá trung bình
                      </p>
                    </motion.div>
                  </Col>
                  <Col md={3}>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6, delay: 0.8 }}
                      viewport={{ once: true }}
                    >
                      <h3 className="fw-bold mb-2" style={{ fontSize: '3rem', color: '#333333' }}>
                        <i className="fas fa-clock me-2" style={{ color: '#4ecdc4' }}></i>
                        2-4h
                      </h3>
                      <p className="mb-0" style={{ opacity: 0.9, color: '#333333' }}>
                        Thời gian trả kết quả
                      </p>
                    </motion.div>
                  </Col>
                  <Col md={3}>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6, delay: 0.9 }}
                      viewport={{ once: true }}
                    >
                      <h3 className="fw-bold mb-2" style={{ fontSize: '3rem', color: '#333333' }}>
                        <i className="fas fa-shield-alt me-2" style={{ color: '#28a745' }}></i>
                        99.9%
                      </h3>
                      <p className="mb-0" style={{ opacity: 0.9, color: '#333333' }}>
                        Độ chính xác
                      </p>
                    </motion.div>
                  </Col>
                </Row>
              </div>
            </motion.div>
          </Container>
        </motion.section>
      </LazyLoad>

      <GuestFooter />
    </div>
  );
};

export default Home;
