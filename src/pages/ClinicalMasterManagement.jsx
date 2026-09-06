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
    Download,
    ExternalLink,
    Image as ImageIcon
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { getMasterData, upsertMasterData, bulkUpsertMasterData, deleteMasterData, clearCategoryMasterData } from '../api';

const CATEGORIES = [
    { id: 'medicine', name: 'Medicines', icon: Stethoscope, color: '#6366f1' },
    { id: 'investigation', name: 'Investigations', icon: Beaker, color: '#10b981' },
    { id: 'procedure', name: 'Procedures', icon: Activity, color: '#f59e0b' },
    { id: 'diagnosis', name: 'Diagnosis (ICD-10)', icon: ClipboardList, color: '#8b5cf6' },
    { id: 'complaint', name: 'Chief Complaints', icon: AlertCircle, color: '#ef4444' },
    { id: 'allergy', name: 'Allergies', icon: AlertCircle, color: '#ec4899' }
];

const parseSafetyStatus = (val) => {
    if (!val) return { status: null, desc: '', raw: '' };
    const raw = String(val).trim();
    const cleanText = raw.replace(/<\/?[^>]+(>|$)/g, ' ').replace(/\s+/g, ' ').trim();
    
    let status = null;
    let desc = cleanText;
    const upper = cleanText.toUpperCase();

    if (upper.startsWith('CONSULT YOUR DOCTOR')) {
        status = 'CONSULT YOUR DOCTOR';
        desc = cleanText.slice('CONSULT YOUR DOCTOR'.length).trim();
    } else if (upper.startsWith('UNSAFE')) {
        status = 'UNSAFE';
        desc = cleanText.slice('UNSAFE'.length).trim();
    } else if (upper.startsWith('SAFE IF PRESCRIBED')) {
        status = 'SAFE IF PRESCRIBED';
        desc = cleanText.slice('SAFE IF PRESCRIBED'.length).trim();
    } else if (upper.startsWith('SAFE')) {
        status = 'SAFE';
        desc = cleanText.slice('SAFE'.length).trim();
    } else if (upper.startsWith('CAUTION')) {
        status = 'CAUTION';
        desc = cleanText.slice('CAUTION'.length).trim();
    }

    desc = desc.replace(/^[:\-–—]\s*/, '').trim();
    return { status, desc: desc || cleanText, raw: cleanText };
};

const getStatusBadgeStyle = (status) => {
    switch (status) {
        case 'UNSAFE':
            return { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' };
        case 'CAUTION':
            return { bg: '#fffbeb', color: '#b45309', border: '#fcd34d' };
        case 'CONSULT YOUR DOCTOR':
            return { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
        case 'SAFE':
        case 'SAFE IF PRESCRIBED':
            return { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' };
        default:
            return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
    }
};

const renderSafetyCell = (value) => {
    if (!value) return <span style={{ color: '#94a3b8' }}>-</span>;
    const { status, desc, raw } = parseSafetyStatus(value);
    const style = getStatusBadgeStyle(status);

    return (
        <div style={{ maxWidth: '220px', display: 'flex', flexDirection: 'column', gap: '3px' }} title={raw}>
            {status && (
                <span style={{ 
                    alignSelf: 'flex-start',
                    fontSize: '10px', 
                    fontWeight: 800, 
                    padding: '2px 7px', 
                    borderRadius: '5px', 
                    background: style.bg, 
                    color: style.color, 
                    border: `1px solid ${style.border}`,
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.3px'
                }}>
                    {status}
                </span>
            )}
            <span style={{ 
                fontSize: '11px', 
                color: '#475569', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap',
                lineHeight: 1.3
            }}>
                {desc}
            </span>
        </div>
    );
};

const extractImageUrls = (input) => {
    if (!input) return [];
    const val = (typeof input === 'string' || Array.isArray(input))
        ? input
        : (input.image_urls || input['Image_Urls'] || input.Image_Urls || input['image_urls'] || input['Image URL'] || input['Image Url'] || input.image_url || input.images || input.Images || input.image || input.Image || input['Image Links'] || input['Image Link'] || input.photos || input.photo);
    if (!val) return [];

    if (Array.isArray(val)) {
        return val.flatMap(v => extractImageUrls(v));
    }

    let s = String(val).trim();
    if (!s || s.toLowerCase().startsWith('store') || s.toLowerCase().includes('°c') || s.toLowerCase().includes('degree')) return [];

    // Parse JSON or Python-style list with single quotes
    if ((s.startsWith('[') && s.endsWith(']')) || (s.startsWith('{') && s.endsWith('}'))) {
        try {
            const parsed = JSON.parse(s.replace(/'/g, '"'));
            if (Array.isArray(parsed)) {
                return parsed.map(x => String(x).trim().replace(/[,;]+$/, '')).filter(Boolean);
            }
        } catch (e) {}
    }

    // Match all http/https URLs cleanly
    const matches = s.match(/https?:\/\/[^\s'"<>\]\)]+/g);
    if (matches && matches.length > 0) {
        return [...new Set(matches.map(m => m.replace(/[,;]+$/, '').trim()))];
    }

    return s.split(/[|\n]/)
        .map(x => x.trim().replace(/^['"\[]|['"\]]$/g, '').replace(/[,;]+$/, ''))
        .filter(x => x && (x.startsWith('http') || x.endsWith('.jpg') || x.endsWith('.png') || x.endsWith('.webp') || x.endsWith('.jpeg')));
};

// All 32 Medicine Fields matching the complete clinical master standard
const MEDICINE_COLUMNS = [
    { key: 'Product ID', label: 'Product ID', width: '130px', render: (i) => <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#4f46e5' }}>{i.product_id || i.code || '-'}</span> },
    { key: 'Product Name', label: 'Product Name', width: '200px', render: (i) => <span style={{ fontWeight: 700, color: '#0f172a' }}>{i.name || '-'}</span> },
    { key: 'Marketer', label: 'Marketer', width: '180px', render: (i) => i.marketing_company || i.marketer || '-' },
    { key: 'Composition', label: 'Composition', width: '210px', render: (i) => i.composition || i.key_ingredients || '-' },
    { key: 'medicine_type', label: 'medicine_type', width: '110px', render: (i) => <span style={{ textTransform: 'capitalize', fontSize: '11px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>{i.medicine_type || i.type || 'drug'}</span> },
    { key: 'Introduction', label: 'Introduction', width: '240px', render: (i) => <div style={{ maxWidth: '230px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={i.introduction || i.information}>{i.introduction || i.information || '-'}</div> },
    { key: 'Benefits', label: 'Benefits', width: '220px', render: (i) => <div style={{ maxWidth: '210px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={i.benefits || i.key_benefits}>{i.benefits || i.key_benefits || '-'}</div> },
    { key: 'how_to_use', label: 'how_to_use', width: '220px', render: (i) => <div style={{ maxWidth: '210px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={i.how_to_use || i.directions_for_use}>{i.how_to_use || i.directions_for_use || '-'}</div> },
    { 
        key: 'safety_advise', 
        label: 'safety_advise', 
        width: '240px', 
        render: (i) => {
            const val = i.safety_advise || i.safety_information;
            if (!val) return '-';
            const clean = String(val).replace(/<\/?[^>]+(>|$)/g, ' ').replace(/\s+/g, ' ').trim();
            return <div style={{ maxWidth: '230px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#b45309' }} title={clean}>{clean}</div>;
        } 
    },
    { key: 'if_miss', label: 'if_miss', width: '200px', render: (i) => <div style={{ maxWidth: '190px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={i.if_miss}>{i.if_miss || '-'}</div> },
    { key: 'Packaging Detail', label: 'Packaging Detail', width: '160px', render: (i) => i.packaging_detail || i.packaging || '-' },
    { key: 'Package', label: 'Package', width: '100px', render: (i) => i.package || i.package_type || '-' },
    { key: 'Qty', label: 'Qty', width: '80px', render: (i) => i.qty != null ? String(i.qty) : '-' },
    { key: 'Product Form', label: 'Product Form', width: '120px', render: (i) => i.product_form || '-' },
    { key: 'MRP', label: 'MRP', width: '110px', render: (i) => i.mrp != null ? <span style={{ fontWeight: 800, color: '#059669' }}>₹{i.mrp}</span> : '-' },
    { 
        key: 'prescription_required', 
        label: 'prescription_required', 
        width: '150px', 
        render: (i) => i.prescription_required ? (
            <span style={{ fontSize: '11px', background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>Rx Required</span>
        ) : (
            <span style={{ fontSize: '11px', background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>OTC</span>
        ) 
    },
    { key: 'Fact_Box', label: 'Fact_Box', width: '180px', render: (i) => i.fact_box || '-' },
    { key: 'primary_use', label: 'primary_use', width: '160px', render: (i) => i.primary_use ? <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>{i.primary_use}</span> : '-' },
    { key: 'storage', label: 'storage', width: '160px', render: (i) => i.storage || '-' },
    { key: 'side_effect', label: 'side_effect', width: '220px', render: (i) => <div style={{ maxWidth: '210px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#dc2626' }} title={i.side_effects}>{i.side_effects || '-'}</div> },
    { key: 'alcoholInteraction', label: 'alcoholInteraction', width: '220px', render: (i) => renderSafetyCell(i.alcohol_interaction) },
    { key: 'pregnancyInteraction', label: 'pregnancyInteraction', width: '220px', render: (i) => renderSafetyCell(i.pregnancy_interaction) },
    { key: 'lactationInteraction', label: 'lactationInteraction', width: '220px', render: (i) => renderSafetyCell(i.lactation_interaction) },
    { key: 'drivingInteraction', label: 'drivingInteraction', width: '220px', render: (i) => renderSafetyCell(i.driving_interaction) },
    { key: 'kidneyInteraction', label: 'kidneyInteraction', width: '220px', render: (i) => renderSafetyCell(i.kidney_interaction) },
    { key: 'liverInteraction', label: 'liverInteraction', width: '220px', render: (i) => renderSafetyCell(i.liver_interaction) },
    { key: 'country_of_origin', label: 'country_of_origin', width: '130px', render: (i) => i.country_of_origin || '-' },
    { key: 'Q_A', label: 'Q_A', width: '220px', render: (i) => <div style={{ maxWidth: '210px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={i.q_a}>{i.q_a || '-'}</div> },
    { key: 'How it works', label: 'How it works', width: '220px', render: (i) => <div style={{ maxWidth: '210px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={i.how_it_works}>{i.how_it_works || '-'}</div> },
    { key: 'drug-drug Interaction', label: 'drug-drug Interaction', width: '220px', render: (i) => <div style={{ maxWidth: '210px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={i.drug_interactions}>{i.drug_interactions || '-'}</div> },
    { 
        key: 'Marketer details', 
        label: 'Marketer details', 
        width: '220px', 
        render: (i) => {
            if (i.marketer_details && i.marketer_details !== i.primary_use) return <div style={{ maxWidth: '210px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={i.marketer_details}>{i.marketer_details}</div>;
            return i.marketing_company || i.marketer || '-';
        }
    },
    { 
        key: 'Image_Urls', 
        label: 'Image_Urls', 
        width: '280px', 
        render: (i) => {
            const urls = extractImageUrls(i);
            if (!urls.length) return <span style={{ color: '#94a3b8' }}>-</span>;
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '240px' }}>
                    {/* Visual Thumbnails */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {urls.slice(0, 4).map((url, idx) => (
                            <a 
                                key={idx} 
                                href={url} 
                                target="_blank" 
                                rel="noreferrer" 
                                title={`Open Image ${idx + 1}: ${url}`}
                                style={{ display: 'inline-block', borderRadius: '6px', border: '1.5px solid #cbd5e1', padding: '2px', background: '#fff', textDecoration: 'none' }}
                            >
                                <img 
                                    src={url} 
                                    alt={`Img ${idx + 1}`} 
                                    referrerPolicy="no-referrer"
                                    style={{ width: '32px', height: '32px', objectFit: 'contain', display: 'block', borderRadius: '3px' }}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%234f46e5" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
                                    }}
                                />
                            </a>
                        ))}
                        <span style={{ fontSize: '11px', color: '#4f46e5', fontWeight: 700, background: '#e0e7ff', padding: '2px 8px', borderRadius: '10px' }}>
                            {urls.length} img{urls.length > 1 ? 's' : ''}
                        </span>
                    </div>

                    {/* Direct Clickable Links */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {urls.map((url, idx) => (
                            <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                title={url}
                                style={{
                                    fontSize: '11px',
                                    color: '#2563eb',
                                    background: '#eff6ff',
                                    border: '1px solid #bfdbfe',
                                    padding: '2px 7px',
                                    borderRadius: '5px',
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    fontWeight: 600,
                                    maxWidth: '120px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <span>Image {idx + 1}</span>
                                <ExternalLink size={10} />
                            </a>
                        ))}
                    </div>
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
        marketer: '',
        type: 'drugs',
        medicine_type: 'drugs',
        packaging: '',
        packaging_detail: '',
        package: 'Strip',
        package_type: 'Strip',
        qty: '',
        product_form: 'Tablet',
        mrp: '',
        prescription_required: true,
        product_highlights: '',
        information: '',
        introduction: '',
        key_ingredients: '',
        composition: '',
        key_benefits: '',
        benefits: '',
        directions_for_use: '',
        how_to_use: '',
        safety_information: '',
        safety_advise: '',
        if_miss: '',
        fact_box: '',
        primary_use: '',
        storage: '',
        side_effects: '',
        alcohol_interaction: '',
        pregnancy_interaction: '',
        lactation_interaction: '',
        driving_interaction: '',
        kidney_interaction: '',
        liver_interaction: '',
        country_of_origin: 'India',
        q_a: '',
        how_it_works: '',
        drug_interactions: '',
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
                marketer: newItem.marketer || newItem.marketing_company || undefined,
                marketing_company: newItem.marketing_company || newItem.marketer || undefined,
                type: newItem.medicine_type || newItem.type || undefined,
                medicine_type: newItem.medicine_type || newItem.type || undefined,
                packaging: newItem.packaging_detail || newItem.packaging || undefined,
                packaging_detail: newItem.packaging_detail || newItem.packaging || undefined,
                package: newItem.package || newItem.package_type || undefined,
                package_type: newItem.package || newItem.package_type || undefined,
                qty: newItem.qty || undefined,
                product_form: newItem.product_form || undefined,
                mrp: newItem.mrp ? parseFloat(newItem.mrp) : undefined,
                prescription_required: newItem.prescription_required !== false,
                product_highlights: newItem.product_highlights || undefined,
                information: newItem.information || newItem.introduction || undefined,
                introduction: newItem.introduction || newItem.information || undefined,
                key_ingredients: newItem.key_ingredients || newItem.composition || undefined,
                composition: newItem.composition || newItem.key_ingredients || undefined,
                key_benefits: newItem.key_benefits || newItem.benefits || undefined,
                benefits: newItem.benefits || newItem.key_benefits || undefined,
                directions_for_use: newItem.directions_for_use || newItem.how_to_use || undefined,
                how_to_use: newItem.how_to_use || newItem.directions_for_use || undefined,
                safety_information: newItem.safety_information || newItem.safety_advise || undefined,
                safety_advise: newItem.safety_advise || newItem.safety_information || undefined,
                if_miss: newItem.if_miss || undefined,
                fact_box: newItem.fact_box || undefined,
                primary_use: newItem.primary_use || undefined,
                storage: newItem.storage || undefined,
                side_effects: newItem.side_effects || undefined,
                alcohol_interaction: newItem.alcohol_interaction || undefined,
                pregnancy_interaction: newItem.pregnancy_interaction || undefined,
                lactation_interaction: newItem.lactation_interaction || undefined,
                driving_interaction: newItem.driving_interaction || undefined,
                kidney_interaction: newItem.kidney_interaction || undefined,
                liver_interaction: newItem.liver_interaction || undefined,
                country_of_origin: newItem.country_of_origin || undefined,
                q_a: newItem.q_a || undefined,
                how_it_works: newItem.how_it_works || undefined,
                drug_interactions: newItem.drug_interactions || undefined,
                marketer_details: newItem.marketer_details || undefined,
                image_urls: extractImageUrls(newItem.image_urls)
            };

            await upsertMasterData(payload);
            setStatus({ type: 'success', message: 'Item saved successfully' });
            setNewItem({
                name: '', product_id: '', category: 'medicine', marketing_company: '', marketer: '', type: 'drugs',
                medicine_type: 'drugs', packaging: '', packaging_detail: '', package: 'Strip', package_type: 'Strip',
                qty: '', product_form: 'Tablet', mrp: '', prescription_required: true, product_highlights: '',
                information: '', introduction: '', key_ingredients: '', composition: '', key_benefits: '', benefits: '',
                directions_for_use: '', how_to_use: '', safety_information: '', safety_advise: '', if_miss: '',
                fact_box: '', primary_use: '', storage: '', side_effects: '', alcohol_interaction: '',
                pregnancy_interaction: '', lactation_interaction: '', driving_interaction: '',
                kidney_interaction: '', liver_interaction: '', country_of_origin: 'India', q_a: '',
                how_it_works: '', drug_interactions: '', marketer_details: '', image_urls: ''
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

    const handleClearCategory = async () => {
        const count = data.length;
        if (count === 0) return;
        const confirmed = window.confirm(
            `Are you sure you want to remove all ${count} ${activeCat.name.toLowerCase()} from the database? This action cannot be undone.`
        );
        if (!confirmed) return;

        try {
            await clearCategoryMasterData(selectedCategory);
            setData([]);
            setStatus({ type: 'success', message: `Successfully cleared all ${activeCat.name.toLowerCase()} from database!` });
        } catch (err) {
            console.error('Failed to clear category:', err);
            setStatus({ type: 'error', message: err.response?.data?.message || 'Failed to clear category' });
        } finally {
            setTimeout(() => setStatus({ type: '', message: '' }), 3500);
        }
    };

    // Export all records with the exact 32 column names
    const handleExportExcel = () => {
        if (!data.length) return;
        const exportRows = data.map(item => ({
            'Product ID': item.product_id || item.code || '',
            'Product Name': item.name || '',
            'Marketer': item.marketing_company || item.marketer || '',
            'Composition': item.composition || item.key_ingredients || '',
            'medicine_type': item.medicine_type || item.type || '',
            'Introduction': item.introduction || item.information || '',
            'Benefits': item.benefits || item.key_benefits || '',
            'how_to_use': item.how_to_use || item.directions_for_use || '',
            'safety_advise': item.safety_advise || item.safety_information || '',
            'if_miss': item.if_miss || '',
            'Packaging Detail': item.packaging_detail || item.packaging || '',
            'Package': item.package || item.package_type || '',
            'Qty': item.qty != null ? item.qty : '',
            'Product Form': item.product_form || '',
            'MRP': item.mrp != null ? item.mrp : '',
            'prescription_required': item.prescription_required ? 'Prescription Required' : 'Not Required',
            'Fact_Box': item.fact_box || '',
            'primary_use': item.primary_use || '',
            'storage': item.storage || '',
            'side_effect': item.side_effects || '',
            'alcoholInteraction': item.alcohol_interaction || '',
            'pregnancyInteraction': item.pregnancy_interaction || '',
            'lactationInteraction': item.lactation_interaction || '',
            'drivingInteraction': item.driving_interaction || '',
            'kidneyInteraction': item.kidney_interaction || '',
            'liverInteraction': item.liver_interaction || '',
            'country_of_origin': item.country_of_origin || '',
            'Q_A': item.q_a || '',
            'How it works': item.how_it_works || '',
            'drug-drug Interaction': item.drug_interactions || '',
            'Marketer details': item.marketer_details || '',
            'Image_Urls': extractImageUrls(item).join(' | ')
        }));

        const ws = XLSX.utils.json_to_sheet(exportRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Medicines');
        XLSX.writeFile(wb, `Clinical_Master_32_Columns_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    // Download template with exact 32 column headers
    const handleDownloadTemplate = () => {
        const templateRows = [{
            'Product ID': 'DRS003256',
            'Product Name': 'Acenac Tablet',
            'Marketer': 'Medley Pharmaceuticals',
            'Composition': 'Aceclofenac (100mg)',
            'medicine_type': 'drugs',
            'Introduction': 'Acenac Tablet is a pain-relieving medicine. It alleviates pain and inflammation in conditions such as rheumatoid arthritis, ankylosing spondylitis, osteoarthritis, low back pain, dental pain, gynecological pain, and painful & inflammatory conditions of the ear, nose, and throat.',
            'Benefits': 'Pain relief and reduction of inflammation in arthritis and acute pain.',
            'how_to_use': 'Acenac Tablet should be taken at the dose and duration advised by your doctor. It should be taken with food or milk to prevent stomach upset.',
            'safety_advise': '- Alcohol : CONSULT YOUR DOCTOR <p> It is not known whether it is safe to consume alcohol with Acenac Tablet. Please consult your doctor. | - Pregnancy : CONSULT YOUR DOCTOR <p> Acenac Tablet is not recommended during pregnancy as there is positive evidence of fetal risk based on animal studies. However, it may still be prescribed by a doctor in situations where the benefits outweigh the risks. | - Breast feeding : CAUTION <p> Acenac Tablet should be used with caution during breastfeeding. Breastfeeding should be held until the treatment of the mother is completed and the drug is eliminated from the body. | - Driving : UNSAFE <p> Acenac Tablet may decrease alertness, affect your vision, or make you feel sleepy and dizzy. Do not drive if these symptoms occur. | - Kidney : CAUTION <p> Acenac Tablet should be used with caution in patients with kidney disease. Dose adjustment may be needed.Use of Acenac Tablet is not recommended in patients with severe kidney disease. | - Liver : CAUTION <p> Acenac Tablet should be used with caution in patients with liver disease. Dose adjustment may be needed.Use of Acenac Tablet is not recommended in patients with severe liver disease. Regular monitoring of liver function tests is advisable while the patient is taking this medicine.',
            'if_miss': 'If you miss a dose, take it as soon as you remember. If it is near the time of the next dose, skip the missed dose and resume your regular schedule.',
            'Packaging Detail': 'strip of 10 tablets',
            'Package': 'Strip',
            'Qty': '10',
            'Product Form': 'Tablet',
            'MRP': 55.78,
            'prescription_required': 'Prescription Required',
            'Fact_Box': 'Store in cool and dry place',
            'primary_use': 'Pain relief',
            'storage': 'Store below 30°C',
            'side_effect': 'Vomiting, stomach pain, nausea, and indigestion',
            'alcoholInteraction': 'CONSULT YOUR DOCTOR <p> It is not known whether it is safe to consume alcohol with Acenac Tablet. Please consult your doctor.',
            'pregnancyInteraction': 'CONSULT YOUR DOCTOR <p> Acenac Tablet is not recommended during pregnancy as there is positive evidence of fetal risk based on animal studies. However, it may still be prescribed by a doctor in situations where the benefits outweigh the risks.',
            'lactationInteraction': 'CAUTION <p> Acenac Tablet should be used with caution during breastfeeding. Breastfeeding should be held until the treatment of the mother is completed and the drug is eliminated from the body.',
            'drivingInteraction': 'UNSAFE <p> Acenac Tablet may decrease alertness, affect your vision, or make you feel sleepy and dizzy. Do not drive if these symptoms occur.',
            'kidneyInteraction': 'CAUTION <p> Acenac Tablet should be used with caution in patients with kidney disease. Dose adjustment may be needed.Use of Acenac Tablet is not recommended in patients with severe kidney disease.',
            'liverInteraction': 'CAUTION <p> Acenac Tablet should be used with caution in patients with liver disease. Dose adjustment may be needed.Use of Acenac Tablet is not recommended in patients with severe liver disease. Regular monitoring of liver function tests is advisable while the patient is taking this medicine.',
            'country_of_origin': 'India',
            'Q_A': 'Q: Can I take Acenac Tablet for a toothache? A: Yes, Acenac Tablet is commonly prescribed for dental pain relief.',
            'How it works': 'Acenac Tablet works by blocking the action of cyclooxygenase (COX) enzymes which produce prostaglandins that cause pain and swelling.',
            'drug-drug Interaction': 'Avoid taking with other NSAIDs (ibuprofen, aspirin) or blood thinners (warfarin).',
            'Marketer details': 'Medley Pharmaceuticals Ltd, Andheri East, Mumbai',
            'Image_Urls': 'https://medicinedata.in/drg/DRS003256_1.jpg | https://medicinedata.in/drg/DRS003256_2.jpg | https://medicinedata.in/drg/DRS003256_3.jpg'
        }];
        const ws = XLSX.utils.json_to_sheet(templateRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        XLSX.writeFile(wb, 'Medicine_32_Columns_Template.xlsx');
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

                    {data.length > 0 && (
                        <button 
                            onClick={handleClearCategory}
                            title={`Clear all ${activeCat.name.toLowerCase()} from database`}
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px', 
                                padding: '10px 14px', 
                                background: '#fff', 
                                border: '1.5px solid #fecaca', 
                                borderRadius: '10px', 
                                fontWeight: 700, 
                                color: '#dc2626', 
                                cursor: 'pointer',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s',
                                fontSize: '13px'
                            }}
                        >
                            <Trash2 size={16} color="#dc2626" />
                            <span>Clear All ({data.length})</span>
                        </button>
                    )}

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
                                                                        whiteSpace: col.key === 'Image_Urls' ? 'normal' : 'nowrap',
                                                                        maxWidth: col.width,
                                                                        overflow: col.key === 'Image_Urls' ? 'visible' : 'hidden',
                                                                        textOverflow: col.key === 'Image_Urls' ? 'clip' : 'ellipsis',
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

                        {/* 32 Complete Clinical Master Grid */}
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
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block' }}>Marketer / Company</span>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginTop: '2px' }}>{viewingItem.marketing_company || viewingItem.marketer || '-'}</div>
                            </div>
                            <div>
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block' }}>medicine_type</span>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginTop: '2px', textTransform: 'capitalize' }}>{viewingItem.medicine_type || viewingItem.type || 'drugs'}</div>
                            </div>
                            <div>
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block' }}>Packaging Detail</span>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginTop: '2px' }}>{viewingItem.packaging_detail || viewingItem.packaging || '-'}</div>
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
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block' }}>prescription_required</span>
                                <div style={{ marginTop: '2px' }}>
                                    {viewingItem.prescription_required ? (
                                        <span style={{ fontSize: '11px', background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>Prescription Required</span>
                                    ) : (
                                        <span style={{ fontSize: '11px', background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>OTC (Not Required)</span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block' }}>country_of_origin</span>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginTop: '2px' }}>{viewingItem.country_of_origin || '-'}</div>
                            </div>
                            {viewingItem.primary_use && (
                                <div>
                                    <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: 700, display: 'block' }}>primary_use</span>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0369a1', marginTop: '2px' }}>{viewingItem.primary_use}</div>
                                </div>
                            )}
                            {viewingItem.storage && (
                                <div>
                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block' }}>storage</span>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginTop: '2px' }}>{viewingItem.storage}</div>
                                </div>
                            )}
                            {viewingItem.fact_box && (
                                <div>
                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block' }}>Fact_Box</span>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginTop: '2px' }}>{viewingItem.fact_box}</div>
                                </div>
                            )}
                        </div>

                        {/* Safety Advisories & Drug Interactions (6 Dedicated Cards) */}
                        <div style={{ marginBottom: '20px' }}>
                            <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>Safety Advisories & Interactions</span>
                                <span style={{ fontSize: '11px', fontWeight: 700, background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '10px' }}>
                                    Clinical Safety
                                </span>
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                                {[
                                    { key: 'alcoholInteraction', label: 'Alcohol', icon: '🍷', val: viewingItem.alcohol_interaction },
                                    { key: 'pregnancyInteraction', label: 'Pregnancy', icon: '🤰', val: viewingItem.pregnancy_interaction },
                                    { key: 'lactationInteraction', label: 'Breast feeding', icon: '🤱', val: viewingItem.lactation_interaction },
                                    { key: 'drivingInteraction', label: 'Driving', icon: '🚗', val: viewingItem.driving_interaction },
                                    { key: 'kidneyInteraction', label: 'Kidney', icon: '🩺', val: viewingItem.kidney_interaction },
                                    { key: 'liverInteraction', label: 'Liver', icon: '🫁', val: viewingItem.liver_interaction }
                                ].map((item) => {
                                    const { status, desc, raw } = parseSafetyStatus(item.val);
                                    const style = getStatusBadgeStyle(status);
                                    return (
                                        <div key={item.key} style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px 14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span>{item.icon}</span>
                                                    <span>{item.label}</span>
                                                </span>
                                                {status && (
                                                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 7px', borderRadius: '5px', background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
                                                        {status}
                                                    </span>
                                                )}
                                            </div>
                                            <p style={{ fontSize: '12px', color: '#475569', lineHeight: 1.45, margin: 0 }}>
                                                {desc || item.val || <span style={{ color: '#94a3b8' }}>No specific warning reported. Consult your doctor.</span>}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Text & Clinical Sections */}
                        {(viewingItem.safety_advise || viewingItem.safety_information) && (
                            <div style={{ marginBottom: '14px' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', marginBottom: '4px' }}>safety_advise (Full Overview)</h4>
                                <div style={{ fontSize: '12px', color: '#991b1b', lineHeight: 1.5, background: '#fef2f2', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                                    {String(viewingItem.safety_advise || viewingItem.safety_information).replace(/<\/?[^>]+(>|$)/g, ' ')}
                                </div>
                            </div>
                        )}

                        {viewingItem.side_effects && (
                            <div style={{ marginBottom: '14px' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', marginBottom: '4px' }}>side_effect</h4>
                                <div style={{ fontSize: '13px', color: '#991b1b', background: '#fff1f2', border: '1px solid #ffe4e6', padding: '10px 14px', borderRadius: '8px', lineHeight: 1.5 }}>
                                    {viewingItem.side_effects}
                                </div>
                            </div>
                        )}

                        {viewingItem.if_miss && (
                            <div style={{ marginBottom: '14px' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>if_miss (Missed Dose Instructions)</h4>
                                <div style={{ fontSize: '13px', color: '#334155', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', lineHeight: 1.5 }}>
                                    {viewingItem.if_miss}
                                </div>
                            </div>
                        )}

                        {(viewingItem.information || viewingItem.introduction) && (
                            <div style={{ marginBottom: '14px' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>Introduction / Information</h4>
                                <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6, background: '#fff', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px' }}>
                                    {viewingItem.information || viewingItem.introduction}
                                </div>
                            </div>
                        )}

                        {(viewingItem.key_ingredients || viewingItem.composition) && (
                            <div style={{ marginBottom: '14px' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>Composition</h4>
                                <div style={{ fontSize: '13px', color: '#334155', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '8px' }}>
                                    {viewingItem.key_ingredients || viewingItem.composition}
                                </div>
                            </div>
                        )}

                        {(viewingItem.key_benefits || viewingItem.benefits) && (
                            <div style={{ marginBottom: '14px' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>Benefits</h4>
                                <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6, background: '#fff', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px' }}>
                                    {viewingItem.key_benefits || viewingItem.benefits}
                                </div>
                            </div>
                        )}

                        {(viewingItem.directions_for_use || viewingItem.how_to_use) && (
                            <div style={{ marginBottom: '14px' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>how_to_use</h4>
                                <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6, background: '#fff', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px' }}>
                                    {viewingItem.directions_for_use || viewingItem.how_to_use}
                                </div>
                            </div>
                        )}

                        {viewingItem.how_it_works && (
                            <div style={{ marginBottom: '14px' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>How it works</h4>
                                <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5, background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    {viewingItem.how_it_works}
                                </div>
                            </div>
                        )}

                        {viewingItem.drug_interactions && (
                            <div style={{ marginBottom: '14px' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', marginBottom: '4px' }}>drug-drug Interaction</h4>
                                <div style={{ fontSize: '13px', color: '#991b1b', lineHeight: 1.5, background: '#fef2f2', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                                    {viewingItem.drug_interactions}
                                </div>
                            </div>
                        )}

                        {viewingItem.q_a && (
                            <div style={{ marginBottom: '14px' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>Q_A (Questions & Answers)</h4>
                                <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5, background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    {viewingItem.q_a}
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

                        {(() => {
                            const urls = extractImageUrls(viewingItem);
                            return (
                                <div style={{ marginBottom: '20px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1.5px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <ImageIcon size={16} color="#4f46e5" />
                                            <span>Product Images & Links (Image_Urls)</span>
                                            <span style={{ fontSize: '11px', background: urls.length ? '#e0e7ff' : '#f1f5f9', color: urls.length ? '#4338ca' : '#64748b', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                                                {urls.length} {urls.length === 1 ? 'image' : 'images'}
                                            </span>
                                        </h4>
                                    </div>

                                    {urls.length > 0 ? (
                                        <>
                                            {/* Visual Image Gallery */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                                                {urls.map((imgUrl, idx) => (
                                                    <div key={idx} style={{ background: '#fff', borderRadius: '10px', border: '1.5px solid #e2e8f0', padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                                        <div style={{ height: '110px', width: '100%', borderRadius: '6px', overflow: 'hidden', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <img 
                                                                src={imgUrl} 
                                                                alt={`Product ${idx + 1}`} 
                                                                referrerPolicy="no-referrer"
                                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                                onError={(e) => {
                                                                    e.target.onerror = null;
                                                                    e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
                                                                }}
                                                            />
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                                                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>Image {idx + 1}</span>
                                                            <a 
                                                                href={imgUrl} 
                                                                target="_blank" 
                                                                rel="noreferrer" 
                                                                title={`Open Image ${idx + 1}`}
                                                                style={{ fontSize: '11px', color: '#2563eb', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px', textDecoration: 'none', background: '#eff6ff', padding: '3px 8px', borderRadius: '5px', border: '1px solid #bfdbfe' }}
                                                            >
                                                                <span>Open</span>
                                                                <ExternalLink size={10} />
                                                            </a>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Full Direct Image Links List */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Direct Image URLs:</span>
                                                {urls.map((u, idx) => (
                                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px', fontSize: '12px' }}>
                                                        <a 
                                                            href={u} 
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            style={{ color: '#2563eb', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '560px', fontFamily: 'monospace', fontWeight: 500 }}
                                                            title={u}
                                                        >
                                                            {u}
                                                        </a>
                                                        <a 
                                                            href={u} 
                                                            target="_blank" 
                                                            rel="noreferrer" 
                                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#4f46e5', fontWeight: 700, textDecoration: 'none', padding: '3px 8px', borderRadius: '4px', background: '#eef2ff', whiteSpace: 'nowrap' }}
                                                        >
                                                            <span>Open Link</span>
                                                            <ExternalLink size={11} />
                                                        </a>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ color: '#94a3b8', fontSize: '13px' }}>
                                            No image links associated with this product.
                                        </div>
                                    )}
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

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Product ID / Code</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. DRS003256"
                                                value={newItem.product_id}
                                                onChange={e => setNewItem({ ...newItem, product_id: e.target.value })}
                                                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '14px', fontFamily: 'monospace' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Primary Use (Indication)</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Pain relief"
                                                value={newItem.primary_use}
                                                onChange={e => setNewItem({ ...newItem, primary_use: e.target.value })}
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

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Marketer Details (Company Address / Info)</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Medley Pharmaceuticals Ltd, Andheri East, Mumbai"
                                            value={newItem.marketer_details}
                                            onChange={e => setNewItem({ ...newItem, marketer_details: e.target.value })}
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '14px' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                                            Image URLs (Multiple images supported — comma, pipe |, or ['url1', 'url2'])
                                        </label>
                                        <textarea
                                            rows={2}
                                            placeholder="https://example.com/med_1.jpg | https://example.com/med_2.jpg"
                                            value={newItem.image_urls}
                                            onChange={e => setNewItem({ ...newItem, image_urls: e.target.value })}
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '13px', resize: 'vertical', fontFamily: 'monospace' }}
                                        />
                                        {(() => {
                                            const detected = extractImageUrls(newItem.image_urls);
                                            if (!detected.length) return null;
                                            return (
                                                <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>
                                                        ✓ Detected {detected.length} link{detected.length > 1 ? 's' : ''}:
                                                    </span>
                                                    {detected.map((u, i) => (
                                                        <span key={i} style={{ fontSize: '11px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '1px 6px', borderRadius: '4px' }}>
                                                            Image {i + 1}
                                                        </span>
                                                    ))}
                                                </div>
                                            );
                                        })()}
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
