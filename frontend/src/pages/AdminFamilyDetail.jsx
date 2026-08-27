import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/shared/DashboardLayout';
import FamilyDetailModal from '../features/family/FamilyDetailModal';

const AdminFamilyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <DashboardLayout userName="Administrator" userRole="admin" subtitle="Family Tree">
      <FamilyDetailModal 
        familyId={id} 
        onClose={() => navigate('/admin/family')} 
        isFullPage={true} 
      />
    </DashboardLayout>
  );
};

export default AdminFamilyDetail;
