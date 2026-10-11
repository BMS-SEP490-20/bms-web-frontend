/**
 * Receptionist Create Patient Page
 * 
 * Page for receptionist to create patient profiles on behalf of elderly patients.
 */
import React from 'react';
import { Container } from 'react-bootstrap';
import ReceptionistPatientCreate from '../../features/reception/components/Receptionist/ReceptionistPatientCreate';

const ReceptionistCreatePatientPage = () => {
  return (
    <Container fluid className="py-4">
      <ReceptionistPatientCreate />
    </Container>
  );
};

export default ReceptionistCreatePatientPage;

