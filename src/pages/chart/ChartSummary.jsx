import React from 'react';
import { usePatient } from '../../contexts/PatientContext';

export default function ChartSummary({ patientId }) {
  const { allergies, problemList, vitalSigns, meds, assessmentScores, orders } = usePatient();

  const patientAllergies = allergies[patientId] || [];
  const patientProblems = problemList[patientId] || [];
  const patientVitals = vitalSigns[patientId] || [];
  const patientMeds = meds[patientId] || [];
  const patientScores = assessmentScores[patientId] || [];
  const patientOrders = orders[patientId] || [];
  const latestVital = patientVitals[0];

  return (
    <div>
      <div className="grid-2 mb-4">
        {/* Active Medications */}
        <div className="card">
          <div className="card-header">
            <h2>💊 Active Medications ({patientMeds.filter(m => m.status === 'Active').length})</h2>
          </div>
          <div className="card-body no-pad">
            <table className="data-table">
              <thead><tr><th>Medication</th><th>Dose</th><th>Frequency</th><th>Controlled</th></tr></thead>
              <tbody>
                {patientMeds.filter(m => m.status === 'Active').map((m) => (
                  <tr key={m.id}>
                    <td className="font-semibold">{m.name}</td>
                    <td>{m.dose}</td>
                    <td className="text-sm">{m.frequency}</td>
                    <td>{m.isControlled ? <span className="badge badge-warning">{m.schedule}</span> : <span className="text-muted">No</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Active Problems */}
        <div className="card">
          <div className="card-header">
            <h2>🩺 Problem List ({patientProblems.filter(p => p.status === 'Active').length})</h2>
          </div>
          <div className="card-body no-pad">
            <table className="data-table">
              <thead><tr><th>ICD-10</th><th>Description</th><th>Status</th></tr></thead>
              <tbody>
                {patientProblems.map((p) => (
                  <tr key={p.id}>
                    <td className="font-semibold" style={{ color: 'var(--primary)' }}>{p.code}</td>
                    <td>{p.description}</td>
                    <td><span className={`badge ${p.status === 'Active' ? 'badge-danger' : 'badge-success'}`}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid-3 mb-4">
        {/* Allergies */}
        <div className="card">
          <div className="card-header">
            <h2>⚠️ Allergies</h2>
          </div>
          <div className="card-body">
            {patientAllergies.map((a) => (
              <div key={a.id} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                <div className="font-semibold">{a.allergen}</div>
                {a.reaction && (
                  <div className="text-sm">
                    <span className={a.severity === 'Severe' ? 'text-danger font-bold' : a.severity === 'Moderate' ? 'text-warning' : 'text-secondary'}>
                      {a.severity}
                    </span> — {a.reaction}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Latest Vitals */}
        <div className="card">
          <div className="card-header">
            <h2>💓 Latest Vitals</h2>
            {latestVital && <span className="text-xs text-muted">{latestVital.date}</span>}
          </div>
          <div className="card-body">
            {latestVital ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><div className="text-xs text-muted">Blood Pressure</div><div className="font-bold">{latestVital.bp}</div></div>
                <div><div className="text-xs text-muted">Heart Rate</div><div className="font-bold">{latestVital.hr} bpm</div></div>
                <div><div className="text-xs text-muted">Temp</div><div className="font-bold">{latestVital.temp}°F</div></div>
                <div><div className="text-xs text-muted">SpO2</div><div className="font-bold">{latestVital.spo2}%</div></div>
                <div><div className="text-xs text-muted">Weight</div><div className="font-bold">{latestVital.weight} lbs</div></div>
                <div><div className="text-xs text-muted">BMI</div><div className="font-bold">{latestVital.bmi}</div></div>
                <div><div className="text-xs text-muted">Resp Rate</div><div className="font-bold">{latestVital.rr}</div></div>
                <div><div className="text-xs text-muted">Pain</div><div className="font-bold">{latestVital.pain}/10</div></div>
              </div>
            ) : (
              <div className="text-muted">No vitals recorded</div>
            )}
          </div>
        </div>

        {/* Recent Assessment Scores */}
        <div className="card">
          <div className="card-header">
            <h2>📊 Recent Scores</h2>
          </div>
          <div className="card-body">
            {patientScores.slice(0, 4).map((s) => {
              const maxScores = { 'PHQ-9': 27, 'GAD-7': 21, 'PCL-5': 80, 'AUDIT-C': 12, 'Columbia Suicide Severity Rating': 6, 'ASRS v1.1': 24, 'MoCA': 30, 'MDQ': 13, 'DAST-10': 10 };
              const max = maxScores[s.tool] || 30;
              const pct = Math.min((s.score / max) * 100, 100);
              const level = pct > 70 ? 'severe' : pct > 50 ? 'high' : pct > 30 ? 'moderate' : 'low';
              return (
                <div key={s.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="font-medium text-sm">{s.tool}</span>
                    <span className="font-bold">{s.score}</span>
                  </div>
                  <div className="score-bar"><div className={`fill ${level}`} style={{ width: `${pct}%` }} /></div>
                  <div className="text-xs text-muted mt-2">{s.interpretation}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pending Orders */}
      {patientOrders.filter(o => o.status === 'Pending' || o.status === 'Pending EPCS Auth').length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2>📝 Pending Orders</h2>
          </div>
          <div className="card-body no-pad">
            <table className="data-table">
              <thead><tr><th>Type</th><th>Description</th><th>Status</th><th>Ordered</th><th>Priority</th></tr></thead>
              <tbody>
                {patientOrders.filter(o => o.status === 'Pending' || o.status === 'Pending EPCS Auth').map((o) => (
                  <tr key={o.id}>
                    <td><span className="badge badge-info">{o.type}</span></td>
                    <td className="font-medium">{o.description}</td>
                    <td><span className={`badge ${o.status.includes('EPCS') ? 'badge-warning' : 'badge-gray'}`}>{o.status}</span></td>
                    <td className="text-sm">{o.orderedDate}</td>
                    <td><span className={`badge ${o.priority === 'Urgent' ? 'badge-danger' : 'badge-gray'}`}>{o.priority}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
