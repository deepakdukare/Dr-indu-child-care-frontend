import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    Plus, 
    Search, 
    Trash2, 
    Edit2, 
    Check, 
    X, 
    Loader2, 
    Stethoscope, 
    Activity, 
    Beaker, 
    AlertCircle,
    Save,
    RefreshCw,
    ClipboardList,
    UploadCloud,
    FileSpreadsheet,
    Info,
    Eye,
    Pill,
    CheckCircle2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { getMasterData, upsertMasterData, bulkUpsertMasterData, deleteMasterData } from '../api';

const CATEGORIES = [
    { id: 'medicine', name: 'Medicines', icon: Stethoscope, color: '#6366f1' },
    { id: 'investigation', name: 'Investigations', icon: Beaker, color: '#10b981' },
    { id: 'procedure', name: 'Procedures', icon: Activity, color: '#f59e0b' },
    { id: 'diagnosis', name: 'Diagnosis (ICD-10)', icon: ClipboardList, color: '#8b5cf6' },
    { id: 'complaint', name: 'Chief Complaints', icon: AlertCircle, color: '#ef4444' },
    { id: 'allergy', name: 'Allergies', icon: AlertCircle, color: '#ec4899' }
];

const ClinicalMasterManagement = () => {
    const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0].id);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    
    // Add single item
    const [isAdding, setIsAdding] = useState(false);
    const [newItem, setNewItem] = useState({
        name: '',
        code: '',
        composition: '',
        marketer: '',
        product_form: 'Tablet',
        mrp: '',
        packaging_detail: '',
        notes: ''
    });
    const [saving, setSaving] = useState(false);
    
    // Excel / CSV Bulk Import
    const [isImporting, setIsImporting] = useState(false);
    const [importingFile, setImportingFile] = useState(null);
    const [parsedRows, setParsedRows] = useState([]);
    const [importLoading, setImportLoading] = useState(false);
    const fileInputRef = useRef(null);

    // Detail view modal
    const [viewingItem, setViewingItem] = useState(null);

    const [status, setStatus] = useState({ type: '', message: '' });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getMasterData({ category: selectedCategory, limit: 300 });
            setData(res.data?.data || []);
        } catch (err) {
            console.error('Failed to load master data', err);
        } finally {
            setLoading(false);
        }
    }, [selectedCategory]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!newItem.name) return;
        setSaving(true);
        try {
            const payload = {
                category: selectedCategory,
                name: newItem.name.trim(),
                code: newItem.code || undefined,
                composition: newItem.composition || undefined,
                marketer: newItem.marketer || undefined,
                product_form: newItem.product_form || undefined,
                mrp: newItem.mrp ? parseFloat(newItem.mrp) : undefined,
                packaging_detail: newItem.packaging_detail || undefined,
                introduction: newItem.notes || undefined,
                metadata: { notes: newItem.notes }
            };

            await upsertMasterData(payload);
            setStatus({ type: 'success', message: 'Item saved successfully' });
            setNewItem({ name: '', code: '', composition: '', marketer: '', product_form: 'Tablet', mrp: '', packaging_detail: '', notes: '' });
            setIsAdding(false);
            loadData();
        } catch (err) {
            setStatus({ type: 'error', message: err.response?.data?.message || 'Failed to save item' });
        } finally {
            setSaving(false);
            setTimeout(() => setStatus({ type: '', message: '' }), 3500);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this master data item?')) return;
        try {
            await deleteMasterData(id);
            setData(data.filter(item => (item.id || item._id) !== id));
            setStatus({ type: 'success', message: 'Item deleted' });
        } catch (err) {
            alert('Failed to delete item');
        } finally {
            setTimeout(() => setStatus({ type: '', message: '' }), 2000);
        }
    };

    // Handle File Drop or Upload
    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImportingFile(file);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const jsonData = XLSX.utils.sheet_to_json(ws);
                setParsedRows(jsonData);
            } catch (err) {
                console.error('Error parsing spreadsheet:', err);
                setStatus({ type: 'error', message: 'Failed to read Excel file format' });
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleConfirmImport = async () => {
        if (!parsedRows.length) return;
        setImportLoading(true);
        try {
            const res = await bulkUpsertMasterData(parsedRows, selectedCategory);
            setStatus({ type: 'success', message: res.data?.message || `Imported ${parsedRows.length} items!` });
            setIsImporting(false);
            setImportingFile(null);
            setParsedRows([]);
            loadData();
        } catch (err) {
            setStatus({ type: 'error', message: err.response?.data?.message || 'Import failed' });
        } finally {
            setImportLoading(false);
            setTimeout(() => setStatus({ type: '', message: '' }), 4000);
        }
    };

    const filteredData = data.filter(item => {
        const q = search.toLowerCase();
        return (
            (item.name && item.name.toLowerCase().includes(q)) ||
            (item.composition && item.composition.toLowerCase().includes(q)) ||
            (item.marketer && item.marketer.toLowerCase().includes(q)) ||
            (item.product_id && item.product_id.toLowerCase().includes(q)) ||
            (item.code && item.code.toLowerCase().includes(q)) ||
            (item.metadata?.code && item.metadata.code.toLowerCase().includes(q))
        );
    });

    const activeCat = CATEGORIES.find(c => c.id === selectedCategory);

    return (
        <div className="master-data-page" style={{ padding: '24px', maxWidth: '1300px', margin: '0 auto' }}>
            {/* Top Header */}
            <div className="header-v4" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>Clinical Master Data</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, background: '#e0e7ff', color: '#4338ca', padding: '3px 10px', borderRadius: '20px' }}>
                            Prisma Postgres
                        </span>
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '14px', marginTop: '2px' }}>
                        Manage global catalogs for prescriptions, investigations, diagnosis ICD-10, and procedures
                    </p>
                </div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                        onClick={() => setIsImporting(true)}
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            padding: '10px 16px', 
                            background: '#f8fafc', 
                            border: '1.5px solid #cbd5e1', 
                            borderRadius: '10px', 
                            fontWeight: 700, 
                            color: '#334155',
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = activeCat.color}
                        onMouseLeave={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                    >
                        <UploadCloud size={18} color={activeCat.color} />
                        <span>Import Excel / CSV</span>
                    </button>

                    <button 
                        onClick={() => setIsAdding(true)}
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            padding: '10px 18px', 
                            background: activeCat.color, 
                            border: 'none', 
                            borderRadius: '10px', 
                            fontWeight: 700, 
                            color: '#fff',
                            cursor: 'pointer',
                            boxShadow: `0 4px 12px ${activeCat.color}40`,
                            transition: 'all 0.2s'
                        }}
                    >
                        <Plus size={18} />
                        <span>Add {activeCat.name.slice(0, -1)}</span>
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px' }}>
                {/* Categories Sidebar */}
                <aside style={{ background: '#fff', borderRadius: '16px', padding: '16px', height: 'fit-content', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px', paddingLeft: '8px', letterSpacing: '0.05em' }}>
                        Categories
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {CATEGORIES.map(cat => {
                            const isSelected = selectedCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => {
                                        setSelectedCategory(cat.id);
                                        setSearch('');
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        width: '100%',
                                        padding: '12px 14px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: isSelected ? `${cat.color}15` : 'transparent',
                                        color: isSelected ? cat.color : '#475569',
                                        fontWeight: isSelected ? 800 : 500,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                        textAlign: 'left'
                                    }}
                                >
                                    <cat.icon size={18} />
                                    <span>{cat.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </aside>

                {/* Main Content Area */}
                <main>
                    <div style={{ background: '#fff', borderRadius: '16px', border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                        {/* Search & Stats Bar */}
                        <div style={{ padding: '16px 20px', borderBottom: '1.5px solid #f1f5f9', display: 'flex', gap: '16px', alignItems: 'center', background: '#fafbfc' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input
                                    type="text"
                                    placeholder={`Search ${activeCat.name.toLowerCase()} by name, composition, code...`}
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    style={{ width: '100%', padding: '10px 14px 10px 42px', borderRadius: '10px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '14px', background: '#fff' }}
                                />
                            </div>
                            
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>
                                {filteredData.length} {filteredData.length === 1 ? 'item' : 'items'}
                            </div>

                            <button 
                                onClick={loadData} 
                                title="Refresh"
                                style={{ padding: '10px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', color: '#64748b' }}
                            >
                                <RefreshCw size={18} className={loading ? 'spinning' : ''} />
                            </button>
                        </div>

                        {/* List / Table */}
                        <div style={{ maxHeight: 'calc(100vh - 270px)', overflowY: 'auto' }}>
                            {loading && (
                                <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                                    <Loader2 size={36} className="spinning" style={{ margin: '0 auto 12px', color: activeCat.color }} />
                                    <p style={{ fontWeight: 600 }}>Loading {activeCat.name}...</p>
                                </div>
                            )}

                            {!loading && filteredData.length === 0 && (
                                <div style={{ padding: '80px 40px', textAlign: 'center', color: '#94a3b8' }}>
                                    <activeCat.icon size={56} style={{ margin: '0 auto 16px', opacity: 0.35, color: activeCat.color }} />
                                    <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>No {activeCat.name.toLowerCase()} found</h4>
                                    <p style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '360px', margin: '0 auto 20px' }}>
                                        Import your Excel spreadsheet or click below to add an entry manually.
                                    </p>
                                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                        <button 
                                            onClick={() => setIsImporting(true)}
                                            style={{ color: activeCat.color, fontWeight: 700, background: '#f8fafc', border: '1.5px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
                                        >
                                            Import Excel
                                        </button>
                                        <button 
                                            onClick={() => setIsAdding(true)} 
                                            style={{ color: '#fff', background: activeCat.color, fontWeight: 700, border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
                                        >
                                            + Add New
                                        </button>
                                    </div>
                                </div>
                            )}

                            {!loading && filteredData.length > 0 && selectedCategory === 'medicine' && (
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 10, borderBottom: '1.5px solid #e2e8f0' }}>
                                        <tr>
                                            <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Medicine Name</th>
                                            <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Composition</th>
                                            <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Packaging / MRP</th>
                                            <th style={{ padding: '12px 18px', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Marketer</th>
                                            <th style={{ padding: '12px 18px', textAlign: 'right', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredData.map(item => {
                                            const itemId = item.id || item._id;
                                            return (
                                                <tr key={itemId} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                    <td style={{ padding: '14px 18px' }}>
                                                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>{item.name}</div>
                                                        <div style={{ display: 'flex', gap: '6px', marginTop: '4px', alignItems: 'center' }}>
                                                            {item.product_form && (
                                                                <span style={{ fontSize: '11px', fontWeight: 600, background: '#eff6ff', color: '#2563eb', padding: '1px 7px', borderRadius: '4px' }}>
                                                                    {item.product_form}
                                                                </span>
                                                            )}
                                                            {item.product_id && (
                                                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                                                    {item.product_id}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '14px 18px', color: '#334155', fontSize: '13px' }}>
                                                        {item.composition || '-'}
                                                    </td>
                                                    <td style={{ padding: '14px 18px', fontSize: '13px' }}>
                                                        <div style={{ fontWeight: 700, color: '#059669' }}>
                                                            {item.mrp != null ? `₹${item.mrp}` : '-'}
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                                            {item.packaging_detail || item.package_type || '-'}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '13px' }}>
                                                        {item.marketer || '-'}
                                                    </td>
                                                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                                                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                                                            <button 
                                                                onClick={() => setViewingItem(item)}
                                                                title="View Details"
                                                                style={{ color: '#6366f1', background: '#e0e7ff', border: 'none', cursor: 'pointer', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700 }}
                                                            >
                                                                <Eye size={14} />
                                                                <span>Details</span>
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDelete(itemId)}
                                                                title="Delete Item"
                                                                style={{ color: '#ef4444', background: '#fee2e2', border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: '6px' }}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}

                            {!loading && filteredData.length > 0 && selectedCategory !== 'medicine' && (
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 10, borderBottom: '1.5px solid #e2e8f0' }}>
                                        <tr>
                                            <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Name</th>
                                            {selectedCategory === 'diagnosis' && <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>ICD-10 Code</th>}
                                            <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Notes / Description</th>
                                            <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredData.map(item => {
                                            const itemId = item.id || item._id;
                                            return (
                                                <tr key={itemId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '14px 20px', fontWeight: 700, color: '#0f172a' }}>{item.name}</td>
                                                    {selectedCategory === 'diagnosis' && (
                                                        <td style={{ padding: '14px 20px', color: '#64748b' }}>
                                                            <span style={{ background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700 }}>
                                                                {item.code || item.metadata?.code || '-'}
                                                            </span>
                                                        </td>
                                                    )}
                                                    <td style={{ padding: '14px 20px', color: '#64748b', fontSize: '13px' }}>
                                                        {item.introduction || item.metadata?.notes || '-'}
                                                    </td>
                                                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                                                        <button 
                                                            onClick={() => handleDelete(itemId)}
                                                            style={{ color: '#ef4444', background: '#fee2e2', border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: '6px' }}
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {/* Medicine Detail View Drawer/Modal */}
            {viewingItem && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                    <div style={{ background: '#fff', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '640px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1.5px solid #f1f5f9', paddingBottom: '16px', marginBottom: '20px' }}>
                            <div>
                                <span style={{ fontSize: '11px', fontWeight: 800, background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                                    {viewingItem.product_form || 'Medicine'}
                                </span>
                                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>{viewingItem.name}</h2>
                                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{viewingItem.composition}</p>
                            </div>
                            <button onClick={() => setViewingItem(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}>
                                <X size={20} color="#64748b" />
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px', background: '#f8fafc', padding: '14px', borderRadius: '12px' }}>
                            <div>
                                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Marketer</span>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginTop: '2px' }}>{viewingItem.marketer || '-'}</div>
                            </div>
                            <div>
                                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>MRP / Packaging</span>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#059669', marginTop: '2px' }}>
                                    {viewingItem.mrp ? `₹${viewingItem.mrp}` : '-'} ({viewingItem.packaging_detail || '-'})
                                </div>
                            </div>
                        </div>

                        {viewingItem.introduction && (
                            <div style={{ marginBottom: '16px' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>Introduction</h4>
                                <p style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6, background: '#fff', border: '1px solid #f1f5f9', padding: '12px', borderRadius: '8px' }}>
                                    {viewingItem.introduction}
                                </p>
                            </div>
                        )}

                        {viewingItem.how_to_use && (
                            <div style={{ marginBottom: '16px' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>How to Use</h4>
                                <p style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6, background: '#fff', border: '1px solid #f1f5f9', padding: '12px', borderRadius: '8px' }}>
                                    {viewingItem.how_to_use}
                                </p>
                            </div>
                        )}

                        {viewingItem.side_effects && (
                            <div style={{ marginBottom: '16px' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', marginBottom: '6px' }}>Common Side Effects</h4>
                                <p style={{ fontSize: '13px', color: '#991b1b', lineHeight: 1.5, background: '#fef2f2', padding: '10px 14px', borderRadius: '8px' }}>
                                    {viewingItem.side_effects}
                                </p>
                            </div>
                        )}

                        {viewingItem.safety_advise && (
                            <div style={{ marginBottom: '16px' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>Safety Warnings & Interactions</h4>
                                <p style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5, background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    {viewingItem.safety_advise}
                                </p>
                            </div>
                        )}

                        <div style={{ textAlign: 'right', marginTop: '24px' }}>
                            <button 
                                onClick={() => setViewingItem(null)} 
                                style={{ padding: '10px 20px', borderRadius: '10px', background: '#0f172a', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Excel / CSV Modal */}
            {isImporting && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                    <div style={{ background: '#fff', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '600px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div>
                                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Import Medicines from Excel / CSV</h2>
                                <p style={{ fontSize: '13px', color: '#64748b' }}>Select a .xlsx, .xls, or .csv file with your medicine columns</p>
                            </div>
                            <button onClick={() => { setIsImporting(false); setParsedRows([]); setImportingFile(null); }} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}>
                                <X size={20} color="#64748b" />
                            </button>
                        </div>

                        {/* File Dropzone */}
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            style={{ 
                                border: '2px dashed #cbd5e1', 
                                borderRadius: '14px', 
                                padding: '36px 20px', 
                                textAlign: 'center', 
                                cursor: 'pointer', 
                                background: '#fafbfc',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileUpload} 
                                accept=".xlsx,.xls,.csv" 
                                style={{ display: 'none' }} 
                            />
                            <FileSpreadsheet size={44} style={{ margin: '0 auto 12px', color: '#6366f1' }} />
                            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '15px' }}>
                                {importingFile ? importingFile.name : 'Click to select or drag & drop Excel file'}
                            </div>
                            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                                Supports .xlsx, .xls, .csv containing Product Name, Composition, MRP, Form, etc.
                            </p>
                        </div>

                        {/* Preview */}
                        {parsedRows.length > 0 && (
                            <div style={{ marginTop: '20px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontWeight: 700, fontSize: '14px', marginBottom: '10px' }}>
                                    <CheckCircle2 size={18} />
                                    <span>Successfully read {parsedRows.length} medicine records!</span>
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>
                                    Sample: <strong>{parsedRows[0]['Product Name'] || parsedRows[0].name}</strong> ({parsedRows[0].Composition || parsedRows[0].composition || 'N/A'})
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button
                                onClick={handleConfirmImport}
                                disabled={parsedRows.length === 0 || importLoading}
                                style={{ 
                                    flex: 2, 
                                    padding: '12px', 
                                    borderRadius: '10px', 
                                    background: parsedRows.length > 0 ? '#6366f1' : '#cbd5e1', 
                                    color: '#fff', 
                                    border: 'none', 
                                    fontWeight: 700, 
                                    cursor: parsedRows.length > 0 ? 'pointer' : 'not-allowed', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    gap: '8px' 
                                }}
                            >
                                {importLoading ? <Loader2 size={18} className="spinning" /> : <Save size={18} />}
                                <span>{importLoading ? 'Importing to Postgres...' : `Upload & Save ${parsedRows.length || ''} Medicines`}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => { setIsImporting(false); setParsedRows([]); setImportingFile(null); }}
                                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Single Item Modal */}
            {isAdding && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                    <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '520px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Add New {activeCat.name.slice(0, -1)}</h2>
                            <button onClick={() => setIsAdding(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}>
                                <X size={20} color="#64748b" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                                    Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder={`e.g. ${selectedCategory === 'medicine' ? 'Amoxicillin 250mg' : activeCat.name.slice(0, -1)}`}
                                    value={newItem.name}
                                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '14px' }}
                                />
                            </div>

                            {selectedCategory === 'medicine' && (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Composition</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Paracetamol 500mg"
                                                value={newItem.composition}
                                                onChange={e => setNewItem({ ...newItem, composition: e.target.value })}
                                                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '14px' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Form</label>
                                            <select
                                                value={newItem.product_form}
                                                onChange={e => setNewItem({ ...newItem, product_form: e.target.value })}
                                                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '14px', background: '#fff' }}
                                            >
                                                <option value="Tablet">Tablet</option>
                                                <option value="Syrup">Syrup</option>
                                                <option value="Injection">Injection</option>
                                                <option value="Capsule">Capsule</option>
                                                <option value="Eye Drop">Eye Drop</option>
                                                <option value="Suspension">Suspension</option>
                                                <option value="Cream/Ointment">Cream / Ointment</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>MRP (₹)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                placeholder="e.g. 55.00"
                                                value={newItem.mrp}
                                                onChange={e => setNewItem({ ...newItem, mrp: e.target.value })}
                                                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '14px' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Packaging</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Strip of 10"
                                                value={newItem.packaging_detail}
                                                onChange={e => setNewItem({ ...newItem, packaging_detail: e.target.value })}
                                                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '14px' }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Marketer / Brand</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Medley Pharmaceuticals"
                                            value={newItem.marketer}
                                            onChange={e => setNewItem({ ...newItem, marketer: e.target.value })}
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '14px' }}
                                        />
                                    </div>
                                </>
                            )}

                            {selectedCategory === 'diagnosis' && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>ICD-10 Code</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. J06.9"
                                        value={newItem.code}
                                        onChange={e => setNewItem({ ...newItem, code: e.target.value })}
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '14px' }}
                                    />
                                </div>
                            )}

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Notes / Description</label>
                                <textarea
                                    rows={2}
                                    placeholder="Clinical indications or guidelines..."
                                    value={newItem.notes}
                                    onChange={e => setNewItem({ ...newItem, notes: e.target.value })}
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '14px', resize: 'none' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    style={{ flex: 2, padding: '12px', borderRadius: '8px', background: activeCat.color, color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                >
                                    {saving ? <Loader2 size={18} className="spinning" /> : <Save size={18} />}
                                    Save Item
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsAdding(false)}
                                    style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Status Toast */}
            {status.message && (
                <div style={{ position: 'fixed', bottom: '24px', right: '24px', padding: '12px 24px', borderRadius: '10px', background: status.type === 'success' ? '#059669' : '#dc2626', color: '#fff', fontWeight: 600, boxShadow: '0 10px 25px rgba(0,0,0,0.15)', zIndex: 10000, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <span>{status.message}</span>
                </div>
            )}

            <style>{`
                .spinning { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default ClinicalMasterManagement;
