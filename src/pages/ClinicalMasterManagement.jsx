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
    CheckCircle2,
    Download
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

// The exact 19 columns requested
const MEDICINE_COLUMNS = [
    { key: 'Product ID', label: 'Product ID', width: '130px', render: (i) => i.product_id || i.code || '-' },
    { key: 'name', label: 'name', width: '200px', render: (i) => i.name || '-' },
    { key: 'Category', label: 'Category', width: '120px', render: (i) => i.category || 'medicine' },
    { key: 'Marketing Company', label: 'Marketing Company', width: '190px', render: (i) => i.marketing_company || i.marketer || '-' },
    { key: 'type', label: 'type', width: '100px', render: (i) => i.type || i.medicine_type || '-' },
    { key: 'Packaging', label: 'Packaging', width: '160px', render: (i) => i.packaging || i.packaging_detail || '-' },
    { key: 'Package', label: 'Package', width: '120px', render: (i) => i.package || i.package_type || '-' },
    { key: 'Qty', label: 'Qty', width: '90px', render: (i) => i.qty != null ? String(i.qty) : '-' },
    { key: 'Product Form', label: 'Product Form', width: '130px', render: (i) => i.product_form || '-' },
    { key: 'MRP', label: 'MRP', width: '110px', render: (i) => i.mrp != null ? `₹${i.mrp}` : '-' },
    { key: 'product_highlights', label: 'product_highlights', width: '220px', render: (i) => i.product_highlights || '-' },
    { key: 'Information', label: 'Information', width: '240px', render: (i) => i.information || i.introduction || '-' },
    { key: 'Key Ingredients', label: 'Key Ingredients', width: '220px', render: (i) => i.key_ingredients || i.composition || '-' },
    { key: 'Key Benefits', label: 'Key Benefits', width: '240px', render: (i) => i.key_benefits || i.benefits || '-' },
    { key: 'Directions for Use', label: 'Directions for Use', width: '220px', render: (i) => i.directions_for_use || i.how_to_use || '-' },
    { key: 'Safety Information', label: 'Safety Information', width: '240px', render: (i) => i.safety_information || i.safety_advise || '-' },
    { key: 'country_of_origin', label: 'country_of_origin', width: '140px', render: (i) => i.country_of_origin || '-' },
    { 
        key: 'Marketer details', 
        label: 'Marketer details', 
        width: '220px', 
        render: (i) => {
            if (i.marketer_details && i.marketer_details !== i.primary_use) return i.marketer_details;
            return i.marketing_company || i.marketer || '-';
        }
    },
    { 
        key: 'Image_Urls', 
        label: 'Image_Urls', 
        width: '180px', 
        render: (i) => {
            const urls = Array.isArray(i.image_urls) ? i.image_urls : (typeof i.image_urls === 'string' && i.image_urls ? i.image_urls.split(/[|,\n]/).map(s => s.trim().replace(/^\[|\]$/g, '')).filter(Boolean) : []);
            if (!urls.length) return '-';
            return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img 
                        src={urls[0]} 
                        alt="" 
                        style={{ width: '26px', height: '26px', objectFit: 'contain', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <span style={{ fontSize: '11px', color: '#4f46e5', fontWeight: 700, background: '#e0e7ff', padding: '2px 7px', borderRadius: '10px' }}>
                        {urls.length} img{urls.length > 1 ? 's' : ''}
                    </span>
                </div>
            );
        }
    }
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
        product_id: '',
        category: 'medicine',
        marketing_company: '',
        type: 'drugs',
        packaging: '',
        package: 'Strip',
        qty: '',
        product_form: 'Tablet',
        mrp: '',
        product_highlights: '',
        information: '',
        key_ingredients: '',
        key_benefits: '',
        directions_for_use: '',
        safety_information: '',
        country_of_origin: 'India',
        marketer_details: '',
        image_urls: ''
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
            const res = await getMasterData({ category: selectedCategory, limit: 500 });
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
                product_id: newItem.product_id || undefined,
                code: newItem.product_id || undefined,
                marketing_company: newItem.marketing_company || undefined,
                type: newItem.type || undefined,
                packaging: newItem.packaging || undefined,
                package: newItem.package || undefined,
                qty: newItem.qty || undefined,
                product_form: newItem.product_form || undefined,
                mrp: newItem.mrp ? parseFloat(newItem.mrp) : undefined,
                product_highlights: newItem.product_highlights || undefined,
                information: newItem.information || undefined,
                key_ingredients: newItem.key_ingredients || undefined,
                key_benefits: newItem.key_benefits || undefined,
                directions_for_use: newItem.directions_for_use || undefined,
                safety_information: newItem.safety_information || undefined,
                country_of_origin: newItem.country_of_origin || undefined,
                marketer_details: newItem.marketer_details || undefined,
                image_urls: newItem.image_urls ? newItem.image_urls.split(',').map(s => s.trim()).filter(Boolean) : []
            };

            await upsertMasterData(payload);
            setStatus({ type: 'success', message: 'Item saved successfully' });
            setNewItem({
                name: '', product_id: '', category: 'medicine', marketing_company: '', type: 'drugs',
                packaging: '', package: 'Strip', qty: '', product_form: 'Tablet', mrp: '',
                product_highlights: '', information: '', key_ingredients: '', key_benefits: '',
                directions_for_use: '', safety_information: '', country_of_origin: 'India',
                marketer_details: '', image_urls: ''
            });
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

    // Export all records with the exact 19 column names
    const handleExportExcel = () => {
        if (!data.length) return;
        const exportRows = data.map(item => ({
            'Product ID': item.product_id || item.code || '',
            'name': item.name || '',
            'Category': item.category || 'medicine',
            'Marketing Company': item.marketing_company || item.marketer || '',
            'type': item.type || item.medicine_type || '',
            'Packaging': item.packaging || item.packaging_detail || '',
            'Package': item.package || item.package_type || '',
            'Qty': item.qty != null ? item.qty : '',
            'Product Form': item.product_form || '',
            'MRP': item.mrp != null ? item.mrp : '',
            'product_highlights': item.product_highlights || '',
            'Information': item.information || item.introduction || '',
            'Key Ingredients': item.key_ingredients || item.composition || '',
            'Key Benefits': item.key_benefits || item.benefits || '',
            'Directions for Use': item.directions_for_use || item.how_to_use || '',
            'Safety Information': item.safety_information || item.safety_advise || '',
            'country_of_origin': item.country_of_origin || '',
            'Marketer details': item.marketer_details || '',
            'Image_Urls': Array.isArray(item.image_urls) ? item.image_urls.join('|') : (item.image_urls || '')
        }));

        const ws = XLSX.utils.json_to_sheet(exportRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Medicines');
        XLSX.writeFile(wb, `Clinical_Master_19_Columns_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    // Download template with exact 19 column headers
    const handleDownloadTemplate = () => {
        const templateRows = [{
            'Product ID': 'DRS003256',
            'name': 'Acenac Tablet',
            'Category': 'medicine',
            'Marketing Company': 'Medley Pharmaceuticals',
            'type': 'drugs',
            'Packaging': '10 tablets in 1 strip',
            'Package': 'Strip',
            'Qty': '10',
            'Product Form': 'Tablet',
            'MRP': 55.00,
            'product_highlights': 'Pain-relieving medicine for arthritis and fever',
            'Information': 'Acenac Tablet is a pain-relieving medicine. It alleviates pain and inflammation...',
            'Key Ingredients': 'Aceclofenac (100mg)',
            'Key Benefits': 'Alleviates pain and inflammation in conditions such as rheumatoid arthritis...',
            'Directions for Use': 'Should be taken at the dose and duration advised by your doctor with food.',
            'Safety Information': 'Common side effects include nausea and dizziness. Avoid alcohol.',
            'country_of_origin': 'India',
            'Marketer details': 'Medley Pharmaceuticals Ltd, Andheri East, Mumbai',
            'Image_Urls': 'https://example.com/med.jpg'
        }];
        const ws = XLSX.utils.json_to_sheet(templateRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        XLSX.writeFile(wb, 'Medicine_19_Columns_Template.xlsx');
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
            const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Import failed';
            setStatus({ type: 'error', message: errorMsg });
        } finally {
            setImportLoading(false);
            setTimeout(() => setStatus({ type: '', message: '' }), 5000);
        }
    };

    const filteredData = data.filter(item => {
        const q = search.toLowerCase();
        return (
            (item.name && item.name.toLowerCase().includes(q)) ||
            (item.key_ingredients && item.key_ingredients.toLowerCase().includes(q)) ||
            (item.composition && item.composition.toLowerCase().includes(q)) ||
            (item.marketing_company && item.marketing_company.toLowerCase().includes(q)) ||
            (item.marketer && item.marketer.toLowerCase().includes(q)) ||
            (item.product_id && item.product_id.toLowerCase().includes(q)) ||
            (item.code && item.code.toLowerCase().includes(q)) ||
            (item.information && item.information.toLowerCase().includes(q)) ||
            (item.product_highlights && item.product_highlights.toLowerCase().includes(q))
        );
    });

    const activeCat = CATEGORIES.find(c => c.id === selectedCategory);

    return (
        <div className="master-data-page" style={{ padding: '24px', maxWidth: '100%', margin: '0 auto' }}>
            {/* Top Header */}
            <div className="header-v4" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>Clinical Master Data</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, background: '#e0e7ff', color: '#4338ca', padding: '3px 10px', borderRadius: '20px' }}>
                            Prisma Postgres Live
                        </span>
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '14px', marginTop: '2px' }}>
                        19-Column Global Clinical Database for Medicines, Prescriptions & Formularies
                    </p>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button 
                        onClick={handleDownloadTemplate}
                        title="Download 19-Column Sample Excel Template"
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            padding: '10px 14px', 
                            background: '#fff', 
                            border: '1.5px solid #cbd5e1', 
                            borderRadius: '10px', 
                            fontWeight: 700, 
                            color: '#475569',
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            transition: 'all 0.2s',
                            fontSize: '13px'
                        }}
                    >
                        <Download size={16} color="#6366f1" />
                        <span>Template</span>
                    </button>

                    <button 
                        onClick={handleExportExcel}
                        disabled={data.length === 0}
                        title="Export current data to 19-Column Excel"
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            padding: '10px 14px', 
                            background: '#fff', 
                            border: '1.5px solid #cbd5e1', 
                            borderRadius: '10px', 
                            fontWeight: 700, 
                            color: '#059669',
                            cursor: data.length ? 'pointer' : 'not-allowed',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            transition: 'all 0.2s',
                            fontSize: '13px'
                        }}
                    >
                        <FileSpreadsheet size={16} color="#059669" />
                        <span>Export Excel ({data.length})</span>
                    </button>

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
                            transition: 'all 0.2s',
                            fontSize: '13px'
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
                            transition: 'all 0.2s',
                            fontSize: '13px'
                        }}
                    >
                        <Plus size={18} />
                        <span>Add {activeCat.name.slice(0, -1)}</span>
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '20px' }}>
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
                <main style={{ minWidth: 0 }}>
                    <div style={{ background: '#fff', borderRadius: '16px', border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                        {/* Search & Stats Bar */}
                        <div style={{ padding: '16px 20px', borderBottom: '1.5px solid #f1f5f9', display: 'flex', gap: '16px', alignItems: 'center', background: '#fafbfc', flexWrap: 'wrap' }}>
                            <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
                                <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input
                                    type="text"
                                    placeholder={`Search ${activeCat.name.toLowerCase()} by name, composition, Product ID...`}
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    style={{ width: '100%', padding: '10px 14px 10px 42px', borderRadius: '10px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '14px', background: '#fff' }}
                                />
                            </div>
                            
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>
                                Showing {filteredData.length} of {data.length} {data.length === 1 ? 'record' : 'records'}
                            </div>

                            <button 
                                onClick={loadData} 
                                title="Refresh data from Postgres"
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
                                    <p style={{ fontWeight: 600 }}>Loading {activeCat.name} from Postgres...</p>
                                </div>
                            )}

                            {!loading && filteredData.length === 0 && (
                                <div style={{ padding: '80px 40px', textAlign: 'center', color: '#94a3b8' }}>
                                    <activeCat.icon size={56} style={{ margin: '0 auto 16px', opacity: 0.35, color: activeCat.color }} />
                                    <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>No {activeCat.name.toLowerCase()} found</h4>
                                    <p style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '360px', margin: '0 auto 20px' }}>
                                        Import your 19-column Excel spreadsheet or click below to add an entry manually.
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
                                <div style={{ overflowX: 'auto', width: '100%' }}>
                                    <table style={{ width: '100%', minWidth: '3500px', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 10, borderBottom: '2px solid #e2e8f0' }}>
                                            <tr>
                                                {MEDICINE_COLUMNS.map(col => (
                                                    <th 
                                                        key={col.key} 
                                                        style={{ 
                                                            padding: '14px 16px', 
                                                            fontSize: '12px', 
                                                            fontWeight: 800, 
                                                            color: '#334155', 
                                                            whiteSpace: 'nowrap',
                                                            width: col.width,
                                                            minWidth: col.width,
                                                            borderRight: '1px solid #f1f5f9'
                                                        }}
                                                    >
                                                        {col.label}
                                                    </th>
                                                ))}
                                                <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 800, color: '#334155', whiteSpace: 'nowrap', width: '120px', minWidth: '120px', position: 'sticky', right: 0, background: '#f8fafc', boxShadow: '-2px 0 6px rgba(0,0,0,0.03)' }}>
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredData.map(item => {
                                                const itemId = item.id || item._id;
                                                return (
                                                    <tr 
                                                        key={itemId} 
                                                        style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }} 
                                                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} 
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                    >
                                                        {MEDICINE_COLUMNS.map(col => {
                                                            const val = col.render(item);
                                                            const isProdId = col.key === 'Product ID';
                                                            const isName = col.key === 'name';
                                                            const isMrp = col.key === 'MRP';
                                                            const isForm = col.key === 'Product Form';
                                                            const isCat = col.key === 'Category';

                                                            return (
                                                                <td 
                                                                    key={col.key} 
                                                                    title={typeof val === 'string' ? val : ''}
                                                                    style={{ 
                                                                        padding: '12px 16px', 
                                                                        fontSize: '13px', 
                                                                        color: isName ? '#0f172a' : '#334155',
                                                                        fontWeight: (isName || isProdId || isMrp) ? 700 : 400,
                                                                        whiteSpace: 'nowrap',
                                                                        maxWidth: col.width,
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        borderRight: '1px solid #f8fafc'
                                                                    }}
                                                                >
                                                                    {isProdId ? (
                                                                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: '4px' }}>
                                                                            {val}
                                                                        </span>
                                                                    ) : isForm ? (
                                                                        <span style={{ fontSize: '11px', fontWeight: 600, background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '4px' }}>
                                                                            {val}
                                                                        </span>
                                                                    ) : isCat ? (
                                                                        <span style={{ fontSize: '11px', fontWeight: 600, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px' }}>
                                                                            {val}
                                                                        </span>
                                                                    ) : isMrp ? (
                                                                        <span style={{ color: '#059669', fontWeight: 800 }}>
                                                                            {val}
                                                                        </span>
                                                                    ) : (
                                                                        val
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                        <td style={{ padding: '12px 16px', textAlign: 'center', whiteSpace: 'nowrap', position: 'sticky', right: 0, background: '#fff', boxShadow: '-2px 0 6px rgba(0,0,0,0.03)' }}>
                                                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                                                                <button 
                                                                    onClick={() => setViewingItem(item)}
                                                                    title="View All 19 Column Details"
                                                                    style={{ color: '#6366f1', background: '#e0e7ff', border: 'none', cursor: 'pointer', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700 }}
                                                                >
                                                                    <Eye size={13} />
                                                                    <span>Details</span>
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDelete(itemId)}
                                                                    title="Delete Medicine"
                                                                    style={{ color: '#ef4444', background: '#fee2e2', border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: '6px' }}
                                                                >
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
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
                                                        {item.information || item.introduction || item.metadata?.notes || '-'}
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

            {/* Medicine Detail View Drawer/Modal - Showing all 19 columns */}
            {viewingItem && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setViewingItem(null)}>
                    <div style={{ background: '#fff', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '780px', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1.5px solid #f1f5f9', paddingBottom: '16px', marginBottom: '20px' }}>
                            <div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 800, background: '#eff6ff', color: '#2563eb', padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                                        {viewingItem.product_form || 'Medicine'}
                                    </span>
                                    {viewingItem.product_id && (
                                        <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, background: '#eef2ff', color: '#6366f1', padding: '3px 8px', borderRadius: '4px' }}>
                                            {viewingItem.product_id}
                                        </span>
                                    )}
                                </div>
                                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', marginTop: '8px' }}>{viewingItem.name}</h2>
                                <p style={{ fontSize: '14px', color: '#64748b', marginTop: '2px' }}>{viewingItem.key_ingredients || viewingItem.composition || '-'}</p>
                            </div>
                            <button onClick={() => setViewingItem(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}>
                                <X size={20} color="#64748b" />
                            </button>
                        </div>

                        {/* 19 Exact Columns Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <div>
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block' }}>Product ID</span>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginTop: '2px', fontFamily: 'monospace' }}>{viewingItem.product_id || viewingItem.code || '-'}</div>
                            </div>
                            <div>
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block' }}>Category</span>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginTop: '2px' }}>{viewingItem.category || 'medicine'}</div>
                            </div>
                            <div>
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block' }}>Marketing Company</span>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginTop: '2px' }}>{viewingItem.marketing_company || viewingItem.marketer || '-'}</div>
                            </div>
                            <div>
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block' }}>type</span>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginTop: '2px' }}>{viewingItem.type || viewingItem.medicine_type || '-'}</div>
                            </div>
                            <div>
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block' }}>Packaging</span>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginTop: '2px' }}>{viewingItem.packaging || viewingItem.packaging_detail || '-'}</div>
                            </div>
                            <div>
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block' }}>Package</span>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginTop: '2px' }}>{viewingItem.package || viewingItem.package_type || '-'}</div>
                            </div>
                            <div>
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block' }}>Qty</span>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginTop: '2px' }}>{viewingItem.qty != null ? String(viewingItem.qty) : '-'}</div>
                            </div>
                            <div>
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block' }}>Product Form</span>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginTop: '2px' }}>{viewingItem.product_form || '-'}</div>
                            </div>
                            <div>
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block' }}>MRP</span>
                                <div style={{ fontSize: '14px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                                    {viewingItem.mrp != null ? `₹${viewingItem.mrp}` : '-'}
                                </div>
                            </div>
                            <div>
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block' }}>country_of_origin</span>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginTop: '2px' }}>{viewingItem.country_of_origin || '-'}</div>
                            </div>
                            {viewingItem.primary_use && (
                                <div>
                                    <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: 700, display: 'block' }}>Primary Use</span>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0369a1', marginTop: '2px' }}>{viewingItem.primary_use}</div>
                                </div>
                            )}
                            {viewingItem.storage && (
                                <div>
                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block' }}>Storage Condition</span>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginTop: '2px' }}>{viewingItem.storage}</div>
                                </div>
                            )}
                        </div>

                        {/* Text Sections */}
                        {viewingItem.product_highlights && (
                            <div style={{ marginBottom: '14px' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>product_highlights</h4>
                                <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5, background: '#f1f5f9', padding: '10px 14px', borderRadius: '8px' }}>
                                    {viewingItem.product_highlights}
                                </div>
                            </div>
                        )}

                        {(viewingItem.information || viewingItem.introduction) && (
                            <div style={{ marginBottom: '14px' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>Information</h4>
                                <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6, background: '#fff', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px' }}>
                                    {viewingItem.information || viewingItem.introduction}
                                </div>
                            </div>
                        )}

                        {(viewingItem.key_ingredients || viewingItem.composition) && (
                            <div style={{ marginBottom: '14px' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>Key Ingredients</h4>
                                <div style={{ fontSize: '13px', color: '#334155', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '8px' }}>
                                    {viewingItem.key_ingredients || viewingItem.composition}
                                </div>
                            </div>
                        )}

                        {(viewingItem.key_benefits || viewingItem.benefits) && (
                            <div style={{ marginBottom: '14px' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>Key Benefits</h4>
                                <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6, background: '#fff', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px' }}>
                                    {viewingItem.key_benefits || viewingItem.benefits}
                                </div>
                            </div>
                        )}

                        {(viewingItem.directions_for_use || viewingItem.how_to_use) && (
                            <div style={{ marginBottom: '14px' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>Directions for Use</h4>
                                <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6, background: '#fff', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px' }}>
                                    {viewingItem.directions_for_use || viewingItem.how_to_use}
                                </div>
                            </div>
                        )}

                        {(viewingItem.safety_information || viewingItem.safety_advise) && (
                            <div style={{ marginBottom: '14px' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', marginBottom: '4px' }}>Safety Information</h4>
                                <div style={{ fontSize: '13px', color: '#991b1b', lineHeight: 1.5, background: '#fef2f2', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                                    {viewingItem.safety_information || viewingItem.safety_advise}
                                </div>
                            </div>
                        )}

                        {viewingItem.marketer_details && viewingItem.marketer_details !== viewingItem.primary_use && (
                            <div style={{ marginBottom: '14px' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>Marketer details</h4>
                                <div style={{ fontSize: '13px', color: '#334155', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', lineHeight: 1.5 }}>
                                    {viewingItem.marketer_details}
                                </div>
                            </div>
                        )}

                        {((Array.isArray(viewingItem.image_urls) && viewingItem.image_urls.length > 0) || (typeof viewingItem.image_urls === 'string' && viewingItem.image_urls.trim())) && (() => {
                            const rawList = Array.isArray(viewingItem.image_urls)
                                ? viewingItem.image_urls
                                : viewingItem.image_urls.split(/[|,\n]/).map(s => s.trim().replace(/^\[|\]$/g, '')).filter(Boolean);
                            const validImgs = rawList.filter(u => u.startsWith('http') || u.endsWith('.jpg') || u.endsWith('.png') || u.endsWith('.webp'));
                            return (
                                <div style={{ marginBottom: '14px' }}>
                                    <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>Image_Urls</span>
                                        <span style={{ fontSize: '11px', background: '#e0e7ff', color: '#4338ca', padding: '1px 8px', borderRadius: '10px' }}>
                                            {validImgs.length} {validImgs.length === 1 ? 'image' : 'images'}
                                        </span>
                                    </h4>
                                    {validImgs.length > 0 && (
                                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                            {validImgs.map((imgUrl, idx) => (
                                                <a 
                                                    key={idx} 
                                                    href={imgUrl} 
                                                    target="_blank" 
                                                    rel="noreferrer" 
                                                    title={`View image ${idx + 1}`}
                                                    style={{ display: 'inline-block', borderRadius: '8px', border: '1.5px solid #cbd5e1', padding: '4px', background: '#fff' }}
                                                >
                                                    <img 
                                                        src={imgUrl} 
                                                        alt={`Product ${idx + 1}`} 
                                                        style={{ width: '64px', height: '64px', objectFit: 'contain', display: 'block' }}
                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                    />
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                    <div style={{ fontSize: '11px', color: '#6366f1', wordBreak: 'break-all', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontFamily: 'monospace' }}>
                                        {validImgs.join(' | ') || String(viewingItem.image_urls)}
                                    </div>
                                </div>
                            );
                        })()}

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
