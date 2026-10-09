import React, { useState } from 'react';
import {
  X,
  FileCode,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Sparkles,
  RefreshCw,
  FileText,
  Copy,
  Layers,
} from 'lucide-react';
import {
  unpackDocxAndAnalyze,
  fillDocxTemplate,
  ExtractedDocxInfo,
} from '../../utils/docxXmlEngine';
import { saveAs } from 'file-saver';

interface WordXmlInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WordXmlInspectorModal: React.FC<WordXmlInspectorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [extractedInfo, setExtractedInfo] = useState<ExtractedDocxInfo | null>(null);
  const [testData, setTestData] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'placeholders' | 'test_fill' | 'raw_xml'>('placeholders');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      setStatusMessage({
        type: 'error',
        text: 'Vui lòng chọn file có định dạng Microsoft Word (.docx).',
      });
      return;
    }

    try {
      setIsProcessing(true);
      setStatusMessage(null);
      const buffer = await file.arrayBuffer();
      setFileBuffer(buffer);
      setFileName(file.name);

      // Băm file và trích xuất XML
      const info = await unpackDocxAndAnalyze(buffer, file.name);
      setExtractedInfo(info);

      // Khởi tạo test data mặc định cho các biến bóc tách được
      const initialTestData: Record<string, string> = {};
      info.placeholders.forEach((ph) => {
        initialTestData[ph] = `[Dữ liệu mẫu: ${ph}]`;
      });
      setTestData(initialTestData);

      setStatusMessage({
        type: 'success',
        text: `Đã băm thành công file Word: Tìm thấy ${info.placeholders.length} biến động XML trong ${info.totalParagraphs} đoạn văn!`,
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: `Lỗi băm file XML: ${err.message || 'Không thể đọc file Word'}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFieldChange = (key: string, value: string) => {
    setTestData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleExportDocx = async () => {
    if (!fileBuffer) return;

    try {
      setIsProcessing(true);
      const outputBlob = await fillDocxTemplate(fileBuffer, testData);
      const outName = fileName.replace(/\.docx$/i, '') + '_filled_from_xml.docx';
      saveAs(outputBlob, outName);

      setStatusMessage({
        type: 'success',
        text: `Đã đóng gói và tải về thành công file "${outName}"!`,
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: `Lỗi đóng gói file .docx: ${err.message}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyTag = (tag: string) => {
    navigator.clipboard.writeText(`{{${tag}}}`);
    setCopiedKey(tag);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-lg shadow-lg flex flex-col max-h-[90vh] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-md bg-blue-900/40 text-blue-400 border border-blue-800">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                Bộ xử lý & Bóc tách XML Template Word (.docx)
                <span className="text-[11px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-mono">
                  XML-Engine
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Băm cấu trúc .docx thành XML $\rightarrow$ Điền biến động $\rightarrow$ Đóng gói lại giữ nguyên 100% định dạng
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status / Alert Bar */}
        {statusMessage && (
          <div
            className={`px-6 py-2.5 text-xs flex items-center gap-2 border-b ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
                : 'bg-rose-950/80 border-rose-800 text-rose-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Upload Area */}
          <div className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl p-6 text-center transition-colors bg-slate-800/30">
            <input
              type="file"
              id="docx-xml-upload"
              accept=".docx"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label
              htmlFor="docx-xml-upload"
              className="cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              <div className="w-12 h-12 rounded-full bg-blue-600/10 text-blue-400 flex items-center justify-center border border-blue-500/20 mb-1">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-200">
                {fileName ? (
                  <span className="text-blue-400 font-mono">{fileName}</span>
                ) : (
                  'Nhấp để chọn file Word (.docx) mẫu từ máy tính'
                )}
              </p>
              <p className="text-xs text-slate-400 max-w-md">
                Hệ thống sẽ tự động giải nén file ZIP, đọc file <code className="text-amber-400 font-mono">word/document.xml</code> và quét các biến có dạng <code className="text-amber-400 font-mono">{'{{ten_bien}}'}</code>
              </p>
            </label>
          </div>

          {/* Extracted Stats & Tabs */}
          {extractedInfo && (
            <div className="space-y-4">
              {/* Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <span className="text-[11px] text-slate-400 block">Biến động tìm thấy</span>
                  <span className="text-lg font-bold text-amber-400 font-mono">
                    {extractedInfo.placeholders.length} biến
                  </span>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <span className="text-[11px] text-slate-400 block">Đoạn văn (Paragraphs)</span>
                  <span className="text-lg font-bold text-blue-400 font-mono">
                    {extractedInfo.totalParagraphs}
                  </span>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <span className="text-[11px] text-slate-400 block">Bảng biểu (Tables)</span>
                  <span className="text-lg font-bold text-purple-400 font-mono">
                    {extractedInfo.totalTables}
                  </span>
                </div>
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <span className="text-[11px] text-slate-400 block">Dung lượng XML</span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">
                    {(extractedInfo.xmlSize / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-slate-800 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('placeholders')}
                  className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 ${
                    activeTab === 'placeholders'
                      ? 'bg-slate-800 text-blue-400 border-t-2 border-blue-500'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Danh sách Biến bóc tách ({extractedInfo.placeholders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('test_fill')}
                  className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 ${
                    activeTab === 'test_fill'
                      ? 'bg-slate-800 text-blue-400 border-t-2 border-blue-500'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Điền thử & Xuất Word
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('raw_xml')}
                  className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 ${
                    activeTab === 'raw_xml'
                      ? 'bg-slate-800 text-blue-400 border-t-2 border-blue-500'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  Mã nguồn XML (document.xml)
                </button>
              </div>

              {/* Tab 1: Placeholders List */}
              {activeTab === 'placeholders' && (
                <div className="space-y-3">
                  {extractedInfo.placeholders.length === 0 ? (
                    <div className="p-6 bg-slate-800/40 rounded-xl text-center text-slate-400 text-xs">
                      Không tìm thấy placeholder dạng <code className="text-amber-400">{'{{bien}}'}</code> trong file này. Hãy chèn thêm các thẻ <code className="text-amber-400">{'{{ho_ten}}'}</code>, <code className="text-amber-400">{'{{ngay_tao}}'}</code> vào file Word rồi thử lại.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {extractedInfo.placeholders.map((key) => (
                        <div
                          key={key}
                          className="flex items-center justify-between p-2.5 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            <code className="text-xs font-mono text-amber-300 font-bold truncate">
                              {`{{${key}}}`}
                            </code>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyTag(key)}
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition-colors"
                            title="Sao chép thẻ"
                          >
                            {copiedKey === key ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Test Fill & Repack */}
              {activeTab === 'test_fill' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400">
                    Nhập dữ liệu vào các ô dưới đây. Khi bấm <strong>"Điền & Tải file Word"</strong>, hệ thống sẽ chèn dữ liệu vào file XML và nén lại thành file .docx hoàn chỉnh.
                  </p>
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-2">
                    {extractedInfo.placeholders.map((key) => (
                      <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <label className="sm:w-48 text-xs font-mono text-amber-300 shrink-0 truncate">
                          {`{{${key}}}`}
                        </label>
                        <input
                          type="text"
                          value={testData[key] || ''}
                          onChange={(e) => handleFieldChange(key, e.target.value)}
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-sans"
                          placeholder={`Nhập giá trị cho ${key}...`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleExportDocx}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
                    >
                      {isProcessing ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Điền XML & Xuất lại file Word (.docx)
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 3: Raw XML Snippet */}
              {activeTab === 'raw_xml' && (
                <div className="space-y-2">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 max-h-72 overflow-y-auto whitespace-pre-wrap break-all select-all">
                    {extractedInfo.documentXml.slice(0, 3000)}
                    {extractedInfo.documentXml.length > 3000 && '\n\n... [Còn tiếp các thẻ XML định dạng khác] ...'}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Toàn bộ văn bản thực chất nằm trong thẻ <code className="text-blue-400">&lt;w:document&gt;</code> & <code className="text-blue-400">&lt;w:body&gt;</code> của chuẩn OpenXML.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 flex items-center justify-between bg-slate-950/40 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Thuật toán XML: Nén Zip + PizZip + Docxtemplater + Clean XML Runs</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
