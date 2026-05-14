/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  LogOut, 
  LogIn, 
  FileText,
  Loader2,
  CalendarDays,
  User as UserIcon,
  Search,
  ChevronDown,
  Tag,
  Check,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { auth, db, login, logout, handleFirestoreError, OperationType } from './lib/firebase';
import { ServiceRecord } from './types';

const DISABILITY_TYPES = [
  "지체장애", "뇌병변장애", "시각장애", "청각장애", "언어장애", 
  "지적장애", "자폐성장애", "정신장애", "신장장애", "심장장애",
  "호흡기장애", "간장애", "안면장애", "장루·요루장애", "간질장애"
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        setRecords([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Records Listener
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const q = query(
      collection(db, 'records'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recordList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ServiceRecord[];
      setRecords(recordList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'records');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || selectedTypes.length === 0) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'records'), {
        title: title.trim(),
        content: content.trim(),
        disabilityTypes: selectedTypes,
        completed: false,
        userId: user.uid,
        userName: user.displayName || '익명 사회복지사',
        userPhoto: user.photoURL,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setTitle('');
      setContent('');
      setSelectedTypes([]);
      setIsFormOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'records');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const deleteRecord = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'records', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `records/${id}`);
    }
  };

  const toggleComplete = async (record: ServiceRecord) => {
    try {
      await updateDoc(doc(db, 'records', record.id), {
        completed: !record.completed,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `records/${record.id}`);
    }
  };

  const exportToHwp = (record: ServiceRecord) => {
    const date = record.createdAt?.toDate().toLocaleDateString('ko-KR', { 
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
    
    // HTML wrapper specifically for Word-compatible (HWP friendly) formats
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
      <meta charset="utf-8">
      <title>${record.title}</title>
      <style>
        body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', dotum, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 800px; margin: 0 auto; padding: 40px; }
        .header { text-align: center; font-size: 28px; font-weight: bold; margin-bottom: 30px; border-bottom: 3px double #000; padding-bottom: 10px; }
        table { border-collapse: collapse; width: 100%; border: 2px solid #000; margin-bottom: 20px; }
        th, td { border: 1px solid #000; padding: 12px; text-align: left; font-size: 14px; }
        th { background-color: #f7f7f7; width: 140px; font-weight: bold; }
        .content-box { height: 400px; vertical-align: top; white-space: pre-wrap; }
        .footer { margin-top: 30px; text-align: right; font-size: 16px; font-weight: bold; }
        .stamp { display: inline-block; width: 60px; height: 60px; border: 2px red solid; border-radius: 50%; color: red; text-align: center; line-height: 60px; font-size: 12px; transform: rotate(-15deg); margin-left: 20px; }
      </style>
      </head>
      <body>
        <div class="container">
          <div class="header">상담 및 서비스 기록지</div>
          <table>
            <tr>
              <th>대상자/제목</th>
              <td>${record.title}</td>
            </tr>
            <tr>
              <th>장애인 특성</th>
              <td>${record.disabilityTypes.join(', ')}</td>
            </tr>
            <tr>
              <th>작성 일시</th>
              <td>${date}</td>
            </tr>
            <tr>
              <th>진행 상태</th>
              <td>${record.completed ? '종료(완료)' : '진행중'}</td>
            </tr>
            <tr>
              <th colspan="2">서비스 및 상담 기록 상세</th>
            </tr>
            <tr>
              <td colspan="2" class="content-box">${record.content?.replace(/\n/g, '<br>') || '내용 없음'}</td>
            </tr>
          </table>
          <div class="footer">
            본인 확인: ________________ (인)<br><br>
            작성자: ${record.userName || '사회복지사'} 
            <div class="stamp">확인인</div>
          </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${record.title.replace(/[/\\?%*:|"<>]/g, '-')}_복지기록.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportAllToHwp = () => {
    if (records.length === 0) return;
    
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Malgun Gothic', sans-serif; padding: 20px; }
        .page-break { page-break-after: always; }
        .header { text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 20px; text-decoration: underline; }
        table { border-collapse: collapse; width: 100%; border: 2px solid #000; margin-bottom: 40px; }
        th, td { border: 1px solid #000; padding: 10px; font-size: 12px; }
        th { background-color: #f2f2f2; width: 120px; }
      </style>
      </head>
      <body>
        ${records.map(record => `
          <div class="page-break">
            <div class="header">서비스 기록 요약 (${record.title})</div>
            <table>
              <tr><th>대상자</th><td>${record.title}</td></tr>
              <tr><th>작성자</th><td>${record.userName}</td></tr>
              <tr><th>장애특성</th><td>${record.disabilityTypes.join(', ')}</td></tr>
              <tr><th>작성일</th><td>${record.createdAt?.toDate().toLocaleDateString()}</td></tr>
              <tr><th>내용</th><td>${record.content?.replace(/\n/g, '<br>') || ''}</td></tr>
            </table>
          </div>
        `).join('')}
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `전체_복지기록_백업_${new Date().toLocaleDateString().replace(/\s/g, '')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!user && !loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white p-12 rounded-[2rem] shadow-2xl shadow-neutral-200 text-center space-y-10"
        >
          <div className="flex justify-center">
            <div className="p-5 bg-indigo-600 rounded-3xl shadow-lg shadow-indigo-100">
              <FileText className="w-12 h-12 text-white" />
            </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">복지기록노트</h1>
            <p className="text-neutral-500 leading-relaxed">
              사회복지사를 위한 전문적인 장애인 서비스 기록 도구입니다.<br/>
              체계적인 기록으로 더 나은 복지를 만듭니다.
            </p>
          </div>
          <button
            onClick={login}
            className="w-full flex items-center justify-center gap-3 bg-indigo-600 p-5 rounded-2xl text-white font-bold hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-xl shadow-indigo-100"
          >
            <LogIn className="w-5 h-5" />
            서비스 시작하기 (Google 연동)
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-md">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">복지기록노트</h1>
          </div>
          
          <div className="flex items-center gap-6 text-slate-600">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden">
                {user?.photoURL ? <img src={user.photoURL} alt="" /> : <UserIcon className="w-4 h-4 text-indigo-600" />}
              </div>
              <span className="text-sm font-semibold hidden sm:inline">{user?.displayName} 사회복지사님</span>
            </div>
            <button
              onClick={logout}
              className="p-2 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
              title="로그아웃"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* Record Form Toggle */}
        {!isFormOpen ? (
          <motion.button 
            layoutId="form-container"
            onClick={() => setIsFormOpen(true)}
            className="w-full bg-indigo-600 text-white p-6 rounded-3xl flex items-center justify-center gap-3 font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-6 h-6" />
            새로운 상담/서비스 기록 작성
          </motion.button>
        ) : (
          <motion.div 
            layoutId="form-container"
            className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-8 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                기록 작성
              </h2>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600 font-medium">취소</button>
            </div>

            <form onSubmit={handleAddRecord} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  대상자 성명 / 제목
                </label>
                <input
                  autoFocus
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 홍길동님 정기 상담"
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none font-medium"
                />
              </div>

              {/* Disability Types Selection */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-500 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  장애인 특성 선택 (중복 선택 가능)
                </label>
                <div className="flex flex-wrap gap-2">
                  {DISABILITY_TYPES.map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleType(type)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        selectedTypes.includes(type) 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  기록 내용
                </label>
                <textarea
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="상담 내용 또는 서비스 진행 상황을 입력하세요..."
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none font-medium resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={!title.trim() || selectedTypes.length === 0 || isSubmitting}
                className="w-full bg-slate-900 text-white p-5 rounded-2xl font-bold hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "기록 저장하기"}
              </button>
            </form>
          </motion.div>
        )}

        {/* Records List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Search className="w-5 h-5 text-indigo-600" />
              함께 나누는 기록 목록
            </h2>
            <div className="flex items-center gap-3">
              {records.length > 0 && (
                <button 
                  onClick={exportAllToHwp}
                  className="text-xs font-bold bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  전체 내보내기
                </button>
              )}
              <span className="text-sm font-mono bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-bold">
                총 {records.length}개
              </span>
            </div>
          </div>

          {loading && records.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="font-medium font-sans">기록을 불러오는 중입니다...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-4 text-slate-300 border-2 border-dashed border-slate-200 rounded-[2.5rem]">
              <CalendarDays className="w-16 h-16 stroke-[1.5]" />
              <div className="text-center">
                <p className="font-bold text-slate-500 text-lg">아직 작성된 기록이 없습니다</p>
                <p className="text-sm">사회복지님의 소중한 첫 기록을 남겨보세요.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <AnimatePresence mode="popLayout">
                {records.map((record) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={record.id}
                    className={`group relative bg-white p-8 rounded-[2rem] border transition-all ${
                      record.completed ? 'border-slate-100 bg-slate-50/50' : 'border-slate-200 shadow-md hover:shadow-xl hover:translate-y-[-2px]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="space-y-2 flex-grow">
                        <div className="flex items-center gap-3 flex-wrap">
                          {record.disabilityTypes.map(type => (
                            <span key={type} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              {type}
                            </span>
                          ))}
                        </div>
                        <h3 className={`text-xl font-bold ${
                          record.completed ? 'text-slate-400' : 'text-slate-900'
                        }`}>
                          {record.title}
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {record.userId === user?.uid && (
                          <>
                            <button
                              onClick={() => toggleComplete(record)}
                              className={`p-2 rounded-xl transition-all ${
                                record.completed ? 'text-green-500 bg-green-50' : 'text-slate-300 hover:text-indigo-600 hover:bg-slate-50'
                              }`}
                              title={record.completed ? "수정 가능으로 변경" : "완료 처리"}
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => deleteRecord(record.id)}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                              title="삭제"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {record.content && (
                      <p className={`text-sm leading-relaxed mb-6 ${
                        record.completed ? 'text-slate-400 italic' : 'text-slate-600'
                      }`}>
                        {record.content}
                      </p>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100 pt-6">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                            {record.userPhoto ? (
                              <img src={record.userPhoto} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <UserIcon className="w-3 h-3 text-slate-400" />
                            )}
                          </div>
                          <span className="text-xs font-bold text-slate-600">{record.userName || '이전 기록'}</span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5" />
                            {record.createdAt?.toDate().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {record.completed && (
                            <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-md flex items-center gap-1 leading-none">
                              <Check className="w-3 h-3" />
                              업무 종료
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={(e) => { e.stopPropagation(); exportToHwp(record); }}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-xl hover:bg-indigo-100 transition-all border border-indigo-100 group"
                      >
                        <Download className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                        한글문서(HWP) 저장
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

      <footer className="max-w-4xl mx-auto px-6 py-12 text-center border-t border-slate-200">
        <p className="text-slate-300 text-xs font-bold tracking-widest uppercase mb-2">
          &copy; {new Date().getFullYear()} WelfareNotes &bull; Dedicated to those who serve
        </p>
        <p className="text-[10px] text-slate-200">
          모든 기록은 안전하게 암호화되어 관리됩니다.
        </p>
      </footer>
    </div>
  );
}
