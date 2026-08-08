'use client';

import React, { useEffect, useRef, useState } from 'react';
import { PenTool, Loader2, UploadCloud, Save, CheckCircle2 } from 'lucide-react';
import ApiService from '../../services/ApiService';
import { useToast } from '../ui/Toast';

/**
 * L&D-only panel to configure the single organization signatory that renders
 * on ALL certificates (bank + exam): a signatory name, title, and uploaded
 * signature image (private S3, presigned).
 */
export default function CertificateSignaturePanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [signatureKey, setSignatureKey] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const b: any = await ApiService.getBranding();
        setName(b?.signatory_name || '');
        setTitle(b?.signatory_title || '');
        setSignatureUrl(b?.signature_url || null);
      } catch {
        /* first-time: no branding yet */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('error', 'Please choose an image (PNG with transparent background works best).'); return; }
    setUploading(true);
    try {
      const presigned: any = await ApiService.presignSignature(file.name, file.type);
      const post = presigned.upload_url; // { url, fields }
      const form = new FormData();
      Object.entries(post.fields || {}).forEach(([k, v]) => form.append(k, v as string));
      form.append('file', file);
      const up = await fetch(post.url, { method: 'POST', body: form });
      if (!up.ok) throw new Error('Upload to storage failed');
      setSignatureKey(presigned.s3_key);
      setSignatureUrl(URL.createObjectURL(file)); // local preview until saved
      toast('success', 'Signature uploaded — remember to Save.');
    } catch (err: any) {
      toast('error', err?.message || 'Signature upload failed');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res: any = await ApiService.updateSignatory({
        signatory_name: name,
        signatory_title: title,
        ...(signatureKey ? { signature_s3_key: signatureKey } : {}),
      });
      if (res?.signature_url) setSignatureUrl(res.signature_url);
      setSignatureKey(null);
      toast('success', 'Certificate signatory saved.');
    } catch (err: any) {
      toast('error', err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 flex items-center gap-3 text-slate-400"><Loader2 className="animate-spin" size={18} /> Loading certificate settings…</div>;
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-1 text-indigo-400">
        <PenTool size={16} />
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Certificate Signatory</span>
      </div>
      <h3 className="text-lg font-bold text-white">Organization signature</h3>
      <p className="text-xs text-slate-500 mt-1 mb-5">Appears on every certificate your learners earn (question banks &amp; exams).</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Signatory name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Dr. Asha Rao"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500/50" />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Head of Learning &amp; Development"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500/50" />
        </div>
      </div>

      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Signature image</label>
      <div className="flex items-center gap-4 mb-6">
        <div className="w-48 h-20 rounded-xl bg-white/5 border border-dashed border-slate-700 flex items-center justify-center overflow-hidden">
          {signatureUrl
            ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={signatureUrl} alt="signature" className="max-h-full max-w-full object-contain" />
            : <span className="text-[10px] text-slate-600">No signature</span>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm text-slate-200 disabled:opacity-50">
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />} Upload image
        </button>
      </div>

      <button onClick={save} disabled={saving}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold disabled:opacity-50">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save signatory
      </button>
      {!signatureUrl && (
        <p className="text-[11px] text-amber-400/80 mt-3 flex items-center gap-1.5"><CheckCircle2 size={12} /> Certificates still generate without a signature — the block falls back cleanly.</p>
      )}
    </div>
  );
}
