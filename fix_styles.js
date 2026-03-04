const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'PublicRegister.jsx');
let src = fs.readFileSync(filePath, 'utf8');

// Find the style block boundaries
const STYLE_OPEN = '<style>{`';
const STYLE_CLOSE = '`}</style>';
const start = src.indexOf(STYLE_OPEN);
const end = src.indexOf(STYLE_CLOSE) + STYLE_CLOSE.length;

if (start === -1 || end === -1) {
    console.error('Style block not found!');
    process.exit(1);
}

console.log(`Replacing style block: chars ${start} to ${end}`);

const newStyle = `<style>{\`
                * { box-sizing: border-box; }
                .public-reg-container {
                    min-height: 100vh;
                    background: #fdfdfe;
                    position: relative;
                    padding: 1rem 0.75rem 3rem;
                    font-family: 'Inter', sans-serif;
                }
                .gradient-bg {
                    position: fixed;
                    top: 0; left: 0; right: 0;
                    height: 280px;
                    background: linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%);
                    z-index: -1;
                }
                .content-wrapper { max-width: 900px; margin: 0 auto; }
                .page-header { display: flex; justify-content: center; margin-bottom: 1.25rem; }
                .logo-section { display: flex; align-items: center; gap: 0.75rem; }
                .logo-icon-wrap {
                    width: 44px; height: 44px; background: white; color: #6366f1;
                    border-radius: 14px; display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 8px 20px rgba(99,102,241,0.15); flex-shrink: 0;
                }
                .brand-name { font-size: 1.2rem; font-weight: 900; color: #0f172a; letter-spacing: -0.03em; margin: 0; }
                .brand-tagline { font-size: 0.75rem; color: #64748b; font-weight: 600; margin: 0.1rem 0 0; }

                .main-card-v3 {
                    background: #fff; border-radius: 20px;
                    border: 1px solid #f1f5f9;
                    box-shadow: 0 20px 60px -10px rgba(0,0,0,0.06);
                    padding: 1.25rem 1rem;
                }

                /* Step 0 */
                .member-check-v3 { text-align: center; }
                .check-header { margin-bottom: 1.75rem; }
                .check-header .icon-main { color: #6366f1; margin-bottom: 0.85rem; }
                .check-header h2 { font-size: 1.35rem; font-weight: 900; color: #0f172a; margin-bottom: 0.35rem; }
                .check-header p { color: #64748b; font-weight: 600; font-size: 0.875rem; margin: 0; }

                .check-options { display: flex; flex-direction: column; gap: 1rem; max-width: 580px; margin: 0 auto; }
                .choice-card {
                    display: flex; align-items: flex-start; gap: 0.85rem; padding: 1rem;
                    background: #f8fafc; border-radius: 16px; border: 2px solid #f1f5f9;
                    cursor: pointer; transition: 0.25s; text-align: left; position: relative;
                }
                .choice-card:hover { border-color: #6366f1; background: #fff; box-shadow: 0 10px 25px rgba(99,102,241,0.1); }
                .choice-icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .choice-icon.new { background: #e0e7ff; color: #4338ca; }
                .choice-icon.existing { background: #fef2f2; color: #ef4444; }
                .choice-content { flex: 1; min-width: 0; }
                .choice-content h3 { font-size: 1rem; font-weight: 800; color: #1e293b; margin-bottom: 0.2rem; }
                .choice-content p { font-size: 0.82rem; color: #64748b; font-weight: 500; line-height: 1.45; margin: 0; }
                .choice-card .arrow { color: #cbd5e1; transition: 0.3s; flex-shrink: 0; }
                .choice-card:hover .arrow { color: #6366f1; transform: translateX(4px); }

                .verify-input-wrap { margin-top: 0.85rem; display: flex; flex-direction: column; gap: 0.6rem; }
                .verify-input-wrap .input-with-icon { min-width: 0; }
                .verify-input-wrap .input-with-icon input { width: 100%; padding: 0.85rem 0.9rem 0.85rem 2.5rem; border-radius: 12px; font-size: 1rem; }
                .btn-verify {
                    background: #6366f1; color: #fff; border: none; border-radius: 12px;
                    padding: 0.9rem 1.5rem; font-weight: 800; font-size: 0.95rem;
                    cursor: pointer; transition: 0.2s; width: 100%; min-height: 50px;
                }
                .btn-verify:hover { background: #4f46e5; }
                .btn-verify:disabled { opacity: 0.6; cursor: not-allowed; }
                .inline-verify-error {
                    display: flex; align-items: flex-start; gap: 0.5rem;
                    margin-top: 0.6rem; padding: 0.65rem 0.9rem;
                    background: #fef2f2; border: 1px solid #fee2e2;
                    border-radius: 10px; color: #ef4444;
                    font-size: 0.8rem; font-weight: 600; line-height: 1.4; text-align: left;
                }

                /* Stepper */
                .stepper-v3 { display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-bottom: 1.75rem; }
                .step-item { display: flex; align-items: center; gap: 0.5rem; color: #94a3b8; transition: 0.3s; }
                .step-item.active { color: #6366f1; }
                .step-item.completed { color: #10b981; }
                .step-badge { width: 28px; height: 28px; border-radius: 8px; border: 2px solid currentColor; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 0.8rem; flex-shrink: 0; }
                .step-label { font-weight: 800; font-size: 0.72rem; }
                .step-line { width: 24px; height: 2px; background: #e2e8f0; }

                /* Alert */
                .alert-v3 { display: flex; align-items: center; gap: 0.75rem; padding: 0.9rem 1rem; border-radius: 14px; margin-bottom: 1.5rem; font-weight: 600; font-size: 0.875rem; }
                .alert-v3.error { background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; }

                /* Registration form */
                .form-section { margin-bottom: 2rem; }
                .section-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
                .section-num { width: 26px; height: 26px; background: #6366f1; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 900; flex-shrink: 0; }
                .section-header h3 { font-size: 1rem; font-weight: 800; color: #1e293b; margin: 0; }

                .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem 0.7rem; }
                .field-group { display: flex; flex-direction: column; gap: 0.45rem; }
                .col-1 { grid-column: span 1; }
                .col-2, .col-3, .col-4, .col-6 { grid-column: span 2; }

                label { font-size: 0.68rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
                input, select, textarea {
                    background: #f8fafc; border: 2px solid #f1f5f9; border-radius: 12px;
                    padding: 0.8rem 0.9rem; font-size: 1rem; font-weight: 600; color: #0f172a;
                    outline: none; transition: 0.2s; width: 100%; box-sizing: border-box;
                    -webkit-appearance: none;
                }
                input:focus, select:focus, textarea:focus { border-color: #6366f1; background: #fff; }
                textarea { height: 90px; resize: none; }

                .time-input-group { display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 0.4rem; }
                .input-icon-wrap { position: relative; }
                .input-icon-wrap svg { position: absolute; left: 0.9rem; top: 50%; transform: translateY(-50%); color: #94a3b8; }
                .input-icon-wrap input { padding-left: 2.5rem; width: 100%; }

                .form-actions { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 2rem; }
                .btn-cancel { width: 100%; height: 52px; border-radius: 14px; border: 2px solid #f1f5f9; background: #fff; color: #64748b; font-weight: 800; font-size: 0.95rem; cursor: pointer; }
                .btn-primary-v3 {
                    width: 100%; height: 54px;
                    background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%);
                    color: #fff; border: none; border-radius: 16px; font-size: 1rem; font-weight: 800;
                    display: flex; align-items: center; justify-content: center; gap: 0.6rem;
                    box-shadow: 0 8px 20px rgba(99,102,241,0.3); cursor: pointer;
                }

                /* Booking step */
                .selected-patient-v3 { margin-bottom: 1.5rem; }
                .p-banner { background: #f8fafc; border-radius: 16px; padding: 1rem; display: flex; justify-content: space-between; align-items: center; border: 1px solid #e2e8f0; gap: 0.6rem; flex-wrap: wrap; }
                .p-info { display: flex; align-items: center; gap: 0.85rem; }
                .p-avatar-circle { width: 42px; height: 42px; background: #fff; color: #6366f1; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(0,0,0,0.06); flex-shrink: 0; }
                .p-name-premium { font-size: 0.95rem; font-weight: 900; color: #0f172a; }
                .p-id-premium { font-size: 0.75rem; color: #64748b; font-weight: 700; }
                .modify-btn-v3 { background: #fff; border: 1.5px solid #e2e8f0; padding: 0.45rem 0.85rem; border-radius: 9px; font-size: 0.78rem; font-weight: 800; color: #64748b; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; white-space: nowrap; }

                .form-grid-v3 { display: grid; grid-template-columns: 1fr; gap: 1.25rem; }
                .field-v3 { display: flex; flex-direction: column; gap: 0.6rem; }
                .field-v3 span, .label-v3 { font-size: 0.7rem; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; }
                .input-with-icon { position: relative; }
                .input-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #6366f1; }
                .input-v3, .select-v3 { width: 100%; border: 2px solid #f1f5f9; border-radius: 14px; padding: 0.9rem 1rem 0.9rem 3.2rem; font-weight: 700; font-size: 1rem; outline: none; background: #fff; box-sizing: border-box; -webkit-appearance: none; }

                .slot-grid-v3 { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 0.5rem; }
                .slot-pill-v3 { padding: 0.65rem 0.4rem; border-radius: 12px; border: 2px solid #e5e7eb; background: #fff; cursor: pointer; transition: 0.2s; text-align: center; min-height: 65px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
                .slot-pill-v3.active { border-color: #6366f1; background: #eef2ff; }
                .slot-time { font-size: 0.85rem; font-weight: 900; color: #1e293b; }
                .slot-range { font-size: 0.62rem; color: #64748b; font-weight: 600; margin-top: 0.1rem; }
                .slot-session { font-size: 0.56rem; font-weight: 900; color: #6366f1; background: #e0e7ff; padding: 0.1rem 0.35rem; border-radius: 4px; margin-top: 0.25rem; display: inline-block; }
                .no-slots-v3 { grid-column: 1 / -1; padding: 1.5rem; background: #fef2f2; color: #ef4444; border-radius: 14px; text-align: center; font-weight: 600; font-size: 0.875rem; }

                .modal-footer-v3 { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1.5rem; }
                .btn-outline-v3 { width: 100%; height: 50px; border-radius: 14px; border: 2px solid #f1f5f9; background: #fff; color: #64748b; font-weight: 800; cursor: pointer; }

                .success-view { text-align: center; padding: 1.5rem 0; }
                .success-icon-wrap { width: 64px; height: 64px; background: #f0fdf4; color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; }
                .success-view h2 { font-size: 1.35rem; font-weight: 900; color: #0f172a; margin-bottom: 0.75rem; }
                .success-view p { color: #64748b; font-size: 0.9rem; line-height: 1.65; margin-bottom: 2rem; }
                .btn-primary-v3.wide { width: 100%; max-width: 300px; margin: 0 auto; }

                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

                /* Tablet (600px+) */
                @media (min-width: 600px) {
                    .public-reg-container { padding: 2rem 1.25rem 3.5rem; }
                    .page-header { margin-bottom: 2.25rem; }
                    .logo-icon-wrap { width: 56px; height: 56px; border-radius: 18px; }
                    .logo-section { gap: 1rem; }
                    .brand-name { font-size: 1.65rem; }
                    .brand-tagline { font-size: 0.85rem; }
                    .main-card-v3 { padding: 2.5rem 2rem; border-radius: 28px; }
                    .check-header { margin-bottom: 2.5rem; }
                    .check-header h2 { font-size: 1.75rem; }
                    .check-header p { font-size: 1rem; }
                    .choice-card { padding: 1.5rem; gap: 1.25rem; border-radius: 20px; }
                    .choice-icon { width: 50px; height: 50px; }
                    .choice-content h3 { font-size: 1.15rem; }
                    .choice-content p { font-size: 0.9rem; }
                    .verify-input-wrap { flex-direction: row; }
                    .btn-verify { width: auto; padding: 0 1.5rem; }
                    .stepper-v3 { gap: 1rem; margin-bottom: 2.5rem; }
                    .step-label { font-size: 0.85rem; }
                    .step-line { width: 40px; }
                    .step-badge { width: 32px; height: 32px; border-radius: 10px; }
                    .form-grid { grid-template-columns: repeat(6, 1fr); gap: 1.25rem 1rem; }
                    .col-1 { grid-column: span 1; }
                    .col-2 { grid-column: span 2; }
                    .col-3 { grid-column: span 3; }
                    .col-4 { grid-column: span 4; }
                    .col-6 { grid-column: span 6; }
                    .form-actions { flex-direction: row; gap: 1.25rem; margin-top: 2.75rem; }
                    .btn-cancel { width: auto; flex: 1; height: 58px; border-radius: 16px; }
                    .btn-primary-v3 { width: auto; flex: 2; height: 58px; border-radius: 16px; font-size: 1.05rem; }
                    .form-grid-v3 { grid-template-columns: 1fr 1fr; gap: 1.75rem; }
                    .modal-footer-v3 { flex-direction: row; gap: 1.25rem; margin-top: 2.25rem; }
                    .btn-outline-v3 { width: auto; flex: 1; height: 54px; }
                    .slot-grid-v3 { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 0.65rem; }
                    .slot-pill-v3 { min-height: 72px; padding: 0.75rem 0.5rem; border-radius: 14px; }
                    .slot-time { font-size: 0.9rem; }
                }

                /* Desktop (900px+) */
                @media (min-width: 900px) {
                    .public-reg-container { padding: 3rem 1.5rem 4rem; }
                    .page-header { margin-bottom: 3.5rem; }
                    .logo-icon-wrap { width: 68px; height: 68px; border-radius: 22px; }
                    .logo-section { gap: 1.5rem; }
                    .brand-name { font-size: 2.1rem; }
                    .brand-tagline { font-size: 1rem; }
                    .main-card-v3 { padding: 3.5rem; border-radius: 36px; }
                    .check-header { margin-bottom: 3rem; }
                    .check-header h2 { font-size: 2rem; }
                    .check-header p { font-size: 1.1rem; }
                    .choice-card { padding: 2rem; gap: 1.5rem; border-radius: 22px; }
                    .choice-icon { width: 56px; height: 56px; }
                    .choice-content h3 { font-size: 1.25rem; }
                    .stepper-v3 { gap: 1.5rem; margin-bottom: 3.5rem; }
                    .step-label { font-size: 1rem; }
                    .step-line { width: 60px; }
                    .step-badge { width: 36px; height: 36px; border-radius: 12px; }
                    .form-section { margin-bottom: 3rem; }
                    .section-header { margin-bottom: 1.75rem; }
                    .form-grid { gap: 1.5rem 1.25rem; }
                    .form-actions { margin-top: 4rem; }
                    .btn-cancel { height: 60px; }
                    .btn-primary-v3 { height: 60px; font-size: 1.1rem; }
                    .modal-footer-v3 { margin-top: 3rem; }
                    .btn-outline-v3 { height: 56px; }
                    .slot-grid-v3 { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); }
                }
\`}</style>`;

const result = src.slice(0, start) + newStyle + src.slice(end);
fs.writeFileSync(filePath, result, 'utf8');
console.log('Done! File updated successfully.');
