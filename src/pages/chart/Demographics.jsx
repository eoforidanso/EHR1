import React from 'react';
import { usePatient } from '../../contexts/PatientContext';

export default function Demographics({ patientId }) {
  const { selectedPatient } = usePatient();
  if (!selectedPatient) return null;
  const p = selectedPatient;

  const Field = ({ label, value }) => (
    <div style={{ marginBottom: 16 }}>
      <div className="text-xs text-muted font-semibold" style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
      <div className="font-medium">{value || '—'}</div>
    </div>
  );

  return (
    <div>
      <div className="grid-2 gap-5">
        {/* Personal Information */}
        <div className="card">
          <div className="card-header"><h2>👤 Personal Information</h2></div>
          <div className="card-body">
            <div className="form-row">
              <Field label="First Name" value={p.firstName} />
              <Field label="Last Name" value={p.lastName} />
            </div>
            <div className="form-row">
              <Field label="Date of Birth" value={`${p.dob} (Age ${p.age})`} />
              <Field label="Gender" value={p.gender} />
            </div>
            <div className="form-row">
              <Field label="Pronouns" value={p.pronouns} />
              <Field label="Marital Status" value={p.maritalStatus} />
            </div>
            <div className="form-row">
              <Field label="Race" value={p.race} />
              <Field label="Ethnicity" value={p.ethnicity} />
            </div>
            <div className="form-row">
              <Field label="Preferred Language" value={p.language} />
              <Field label="SSN" value={p.ssn} />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="card">
          <div className="card-header"><h2>📞 Contact Information</h2></div>
          <div className="card-body">
            <Field label="Home Phone" value={p.phone} />
            <Field label="Cell Phone" value={p.cellPhone} />
            <Field label="Email" value={p.email} />
            <Field label="Address" value={`${p.address.street}, ${p.address.city}, ${p.address.state} ${p.address.zip}`} />

            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>🆘 Emergency Contact</h3>
              <Field label="Name" value={p.emergencyContact.name} />
              <Field label="Relationship" value={p.emergencyContact.relationship} />
              <Field label="Phone" value={p.emergencyContact.phone} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2 gap-5 mt-5">
        {/* Insurance */}
        <div className="card">
          <div className="card-header"><h2>🏥 Insurance Information</h2></div>
          <div className="card-body">
            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--primary)' }}>Primary Insurance</h3>
            <Field label="Plan" value={p.insurance.primary.name} />
            <Field label="Member ID" value={p.insurance.primary.memberId} />
            <Field label="Group Number" value={p.insurance.primary.groupNumber} />
            <Field label="Copay" value={`$${p.insurance.primary.copay}`} />

            {p.insurance.secondary && (
              <>
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--secondary)' }}>Secondary Insurance</h3>
                  <Field label="Plan" value={p.insurance.secondary.name} />
                  <Field label="Member ID" value={p.insurance.secondary.memberId} />
                  {p.insurance.secondary.groupNumber && <Field label="Group Number" value={p.insurance.secondary.groupNumber} />}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Care Team */}
        <div className="card">
          <div className="card-header"><h2>👨‍⚕️ Care Team</h2></div>
          <div className="card-body">
            <Field label="Primary Care Provider" value={p.pcp} />
            <Field label="MRN" value={p.mrn} />
            <Field label="Last Visit" value={p.lastVisit} />
            <Field label="Next Appointment" value={p.nextAppointment} />
            <Field label="Status" value={p.isActive ? 'Active' : 'Inactive'} />

            {p.flags.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div className="text-xs text-muted font-semibold mb-2" style={{ textTransform: 'uppercase' }}>Patient Flags</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {p.flags.map((f, i) => (
                    <span key={i} className={`badge ${f.includes('Suicide') ? 'badge-danger' : f.includes('Substance') ? 'badge-warning' : f === 'VIP' ? 'badge-purple' : f.includes('BTG') ? 'badge-danger' : 'badge-info'}`}>
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
