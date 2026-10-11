/**
 * Receptionist Check-In Page
 * 
 * Page for receptionist to check-in patients using QR code scanning.
 */
import React from 'react';
import { Container } from 'react-bootstrap';
import ReceptionistCheckIn from '../../features/reception/components/Receptionist/ReceptionistCheckIn';

const ReceptionistCheckInPage = () => {
  return (
    <div style={{ overflowX: 'hidden', maxWidth: '100%', width: '100%' }}>
      <ReceptionistCheckIn />
    </div>
  );
};

export default ReceptionistCheckInPage;

