import React, { useState, useEffect } from 'react';
import { 
  Shield, Search, AlertTriangle, CheckCircle, Loader2, Info, 
  ChevronRight, Phone, Siren, Ban, ShieldAlert, Settings, 
  History, Menu, X, Share2, Save, FileWarning, Globe, Smartphone, Lock, 
  Plus, Trash2, KeyRound, Copy
} from 'lucide-react';
import { analyzePhoneNumber } from './services/geminiService';
import { AnalysisResult, AnalysisStatus, HistoryItem } from './types';
import RiskGauge from './components/RiskGauge';

// --- Types for App Management ---
interface AppItem {
  id: string;
  title: string;
  description: string;
}

const DEFAULT_APPS: AppItem[] = [
  { id: '1', title: '척추측만증 AI 진단', description: '카메라로 체형을 분석하여 척추 건강 상태를 체크하세요.' },
  { id: '2', title: '딥페이크 탐지기', description: '영상 통화 중 상대방의 얼굴이 딥페이크인지 실시간으로 분석합니다.' }
];

const App: React.FC = () => {
  const [inputNumber, setInputNumber] = useState('');
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Modals State
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReport, setShowReport] = useState(false);
  
  // Admin & Apps State
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [apps, setApps] = useState<AppItem[]>(DEFAULT_APPS);
  const [newAppTitle, setNewAppTitle] = useState('');
  const [newAppDesc, setNewAppDesc] = useState('');

  // Data State
  const [apiKey, setApiKey] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [reportNumber, setReportNumber] = useState('');
  const [reportType, setReportType] = useState('phishing');

  // Load from LocalStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('phishguard_api_key');
    if (savedKey) setApiKey(savedKey);

    const savedHistory = localStorage.getItem('phishguard_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    const savedApps = localStorage.getItem('phishguard_apps');
    if (savedApps) {
      setApps(JSON.parse(savedApps));
    } else {
      setApps(DEFAULT_APPS); // Initialize defaults if empty
    }
  }, []);

  const saveApiKey = () => {
    localStorage.setItem('phishguard_api_key', apiKey);
    setShowSettings(false);
    alert('API Key가 저장되었습니다.');
  };

  const addToHistory = (item: AnalysisResult) => {
    const newItem: HistoryItem = {
      ...item,
      id: Date.now().toString(),
      timestamp: Date.now()
    };
    const updatedHistory = [newItem, ...history].slice(0, 50); // Keep last 50
    setHistory(updatedHistory);
    localStorage.setItem('phishguard_history', JSON.stringify(updatedHistory));
  };

  // --- App Management Functions ---
  const handleAdminLogin = () => {
    if (adminPassword === '1234') {
      setShowAdminLogin(false);
      setShowSettings(false); // Close settings
      setShowAdminPanel(true);
      setAdminPassword('');
    } else {
      alert('비밀번호가 올바르지 않습니다.');
    }
  };

  const handleAddApp = () => {
    if (!newAppTitle.trim() || !newAppDesc.trim()) return;
    const newApp: AppItem = {
      id: Date.now().toString(),
      title: newAppTitle,
      description: newAppDesc
    };
    const updatedApps = [...apps, newApp];
    setApps(updatedApps);
    localStorage.setItem('phishguard_apps', JSON.stringify(updatedApps));
    setNewAppTitle('');
    setNewAppDesc('');
  };

  const handleDeleteApp = (id: string) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      const updatedApps = apps.filter(app => app.id !== id);
      setApps(updatedApps);
      localStorage.setItem('phishguard_apps', JSON.stringify(updatedApps));
    }
  };

  // --- Analysis Function ---
  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputNumber.trim()) return;

    setStatus(AnalysisStatus.LOADING);
    setError(null);
    setResult(null);

    try {
      const data = await analyzePhoneNumber(inputNumber, apiKey);
      setResult(data);
      addToHistory(data);
      setStatus(AnalysisStatus.SUCCESS);
    } catch (err: any) {
      console.error(err);
      let errorMessage = "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
      if (err.message?.includes('API Key')) {
        errorMessage = "API Key 오류입니다. 설정에서 올바른 키를 입력해주세요.";
      } else if (err.message?.includes('429')) {
        errorMessage = "사용량이 많아 분석이 지연되고 있습니다. 잠시 후 시도하거나 개인 API Key를 설정해주세요.";
      }
      setError(errorMessage);
      setStatus(AnalysisStatus.ERROR);
    }
  };

  // --- Share Functions ---
  const handleShareResult = async () => {
    if (!result) return;
    
    const appUrl = window.location.href;
    const text = `🛡️ [PhishGuard AI 분석 결과]

📞 번호: ${result.normalizedNumber}
📊 위험도: ${result.riskScore}점
🔍 분류: ${result.category}

💡 요약:
${result.summary.map(s => `- ${s}`).join('\n')}

👇 이 번호 조회 & 예방하기:
${appUrl}`;
    
    // Try Web Share API first (Mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'PhishGuard AI 분석 결과',
          text: text,
          url: appUrl,
        });
        return;
      } catch (err) {
        console.log('Share canceled or failed, falling back to clipboard');
      }
    }
    
    // Fallback to Clipboard (Desktop/Unsupported)
    try {
      await navigator.clipboard.writeText(text);
      alert('✅ 결과와 앱 주소가 복사되었습니다!\n\n카카오톡이나 문자에 [붙여넣기] 하여 공유하세요.');
    } catch (err) {
      alert('❌ 복사에 실패했습니다. 브라우저 권한을 확인해주세요.');
    }
  };

  const handleShareApp = async () => {
    const url = window.location.href;
    const text = "🕵️‍♂️ 보이스피싱, 받기 전에 확인하세요!\n\nPhishGuard AI가 의심스러운 번호를 실시간으로 분석해드립니다. 지금 바로 확인해보세요.";

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'PhishGuard AI - 보이스피싱 탐지',
          text: text,
          url: url
        });
      } catch (err) {
        console.log('Share canceled');
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${text}\n\n👇 앱 바로가기:\n${url}`);
        alert('✅ 앱 소개와 주소가 복사되었습니다!\n\n지인에게 [붙여넣기] 하여 알려주세요.');
      } catch (err) {
        alert('주소 복사에 실패했습니다.');
      }
    }
  };

  const handleReport = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`[신고 접수 완료]\n번호: ${reportNumber}\n유형: ${reportType === 'phishing' ? '보이스피싱/스팸' : '없는 번호'}\n\n소중한 제보 감사합니다.`);
    setReportNumber('');
    setShowReport(false);
  };

  const isHighRisk = (result?.riskScore || 0) >= 70;
  const isMediumRisk = (result?.riskScore || 0) >= 40 && (result?.riskScore || 0) < 70;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden flex flex-col">
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-700 shadow-md">
        <button onClick={() => setShowMenu(true)} className="p-2 hover:bg-slate-800 rounded-full transition">
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          {/* 상징 로고 */}
          <Shield className="w-7 h-7 text-red-600 fill-red-600" />
          <span className="font-bold text-xl tracking-tight text-white">PhishGuard AI</span>
        </div>
        <div className="flex gap-1">
          {/* App Share Button (New) */}
          <button onClick={handleShareApp} className="p-2 hover:bg-slate-800 rounded-full transition text-blue-400">
            <Share2 className="w-6 h-6" />
          </button>
          <button onClick={() => setShowHistory(true)} className="p-2 hover:bg-slate-800 rounded-full transition">
            <History className="w-6 h-6" />
          </button>
          <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-slate-800 rounded-full transition">
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-slate-900 text-white pb-24 pt-28 px-4 shadow-xl relative overflow-hidden flex-shrink-0">
        {/* 중앙 정렬된 로고 배경 */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-10 animate-pulse">
           <Shield className="w-80 h-80 text-red-600" />
        </div>
        
        <header className="max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 mb-4 bg-red-950/50 px-4 py-1.5 rounded-full border border-red-500/30 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span className="text-xs font-semibold tracking-wider text-red-100 uppercase">AI Real-time Protection</span>
          </div>
          
          <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tight leading-tight">
            의심되는 전화번호<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">받기 전에 확인하세요</span>
          </h1>
          <p className="text-slate-400 text-md md:text-lg font-medium mb-4">
            AI가 실시간으로 보이스피싱 위험도를 분석합니다.
          </p>
        </header>
      </div>

      <main className="max-w-3xl mx-auto px-4 -mt-16 relative z-20 flex-grow w-full pb-10">
        
        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-2xl p-2 mb-6 border border-slate-200">
          <form onSubmit={handleAnalyze} className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Phone className="h-6 w-6 text-slate-400" />
              </div>
              <input
                id="phone"
                type="tel"
                className="block w-full pl-12 pr-4 py-4 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-xl font-bold text-slate-900 placeholder:text-slate-400"
                placeholder="010-0000-0000"
                value={inputNumber}
                onChange={(e) => setInputNumber(e.target.value)}
                disabled={status === AnalysisStatus.LOADING}
              />
            </div>
            <button
              type="submit"
              disabled={status === AnalysisStatus.LOADING || !inputNumber.trim()}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center text-lg whitespace-nowrap"
            >
              {status === AnalysisStatus.LOADING ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Search className="w-6 h-6 mr-2" />
                  검사
                </>
              )}
            </button>
          </form>
        </div>

        {/* Report Button */}
        <div className="flex justify-end mb-8">
            <button 
              onClick={() => setShowReport(true)}
              className="text-sm font-medium text-slate-500 hover:text-red-600 flex items-center gap-1 transition-colors underline decoration-slate-300 underline-offset-4"
            >
              <FileWarning className="w-4 h-4" />
              없는 번호 / 스팸 번호 신고하기
            </button>
        </div>

        {/* Error Message */}
        {status === AnalysisStatus.ERROR && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-r-xl shadow-sm animate-fade-in">
            <div className="flex">
              <AlertTriangle className="h-6 w-6 text-red-500 mr-3" />
              <p className="font-medium text-red-700 text-sm leading-relaxed">{error}</p>
            </div>
            {error?.includes('API Key') && (
              <button 
                onClick={() => setShowSettings(true)}
                className="mt-3 text-xs font-bold text-red-600 underline"
              >
                설정 바로가기
              </button>
            )}
          </div>
        )}

        {/* Results Section */}
        {status === AnalysisStatus.SUCCESS && result && (
          <div className="space-y-6 animate-fade-in-up mb-12">
            
            {/* Top Card */}
            <div className={`rounded-3xl shadow-xl overflow-hidden border-2 relative ${
              isHighRisk ? 'border-red-500 bg-white' : 
              isMediumRisk ? 'border-amber-400 bg-white' : 
              'border-green-400 bg-white'
            }`}>
              
              <div className={`px-6 py-4 flex items-center justify-center gap-2 ${
                isHighRisk ? 'bg-red-600 text-white' : 
                isMediumRisk ? 'bg-amber-500 text-white' : 
                'bg-green-600 text-white'
              }`}>
                {isHighRisk ? <Siren className="w-6 h-6 animate-pulse" /> : 
                 isMediumRisk ? <AlertTriangle className="w-6 h-6" /> : 
                 <CheckCircle className="w-6 h-6" />}
                <span className="text-xl font-black tracking-wide">
                  {isHighRisk ? '보이스피싱 위험!' : 
                   isMediumRisk ? '주의 필요' : 
                   '안전 양호'}
                </span>
              </div>

              <div className="p-8">
                {isHighRisk && (
                  <div className="flex flex-col items-center justify-center mb-8 bg-red-50 p-6 rounded-2xl border border-red-100 text-center">
                    <Ban className="w-16 h-16 text-red-600 mb-2 opacity-90" />
                    <h3 className="text-2xl font-black text-red-600 mb-1">절대 받지 마세요!</h3>
                    <p className="text-red-800 font-medium text-sm">범죄 신고 패턴과 매우 유사합니다.</p>
                  </div>
                )}

                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex-1 text-center md:text-left">
                    <div className="text-sm font-bold text-slate-400 mb-1">분석 번호</div>
                    <div className="text-4xl font-black text-slate-900 tracking-tight mb-4 font-mono">
                      {result.normalizedNumber}
                    </div>
                    <div className={`inline-block px-4 py-2 rounded-lg font-bold text-sm ${
                      isHighRisk ? 'bg-red-100 text-red-700' : 
                      isMediumRisk ? 'bg-amber-100 text-amber-800' : 
                      'bg-green-100 text-green-700'
                    }`}>
                      {result.category}
                    </div>
                  </div>
                  
                  <div className="w-40 flex-shrink-0 mx-auto md:mx-0">
                    <RiskGauge score={result.riskScore} />
                  </div>
                </div>
              </div>

              <div className={`px-6 py-5 border-t ${
                 isHighRisk ? 'bg-red-50 border-red-100' : 
                 isMediumRisk ? 'bg-amber-50 border-amber-100' : 
                 'bg-green-50 border-green-100'
              }`}>
                <div className="flex items-start gap-3">
                  <Info className={`w-5 h-5 flex-shrink-0 mt-1 ${
                    isHighRisk ? 'text-red-600' : isMediumRisk ? 'text-amber-600' : 'text-green-600'
                  }`} />
                  <div>
                    <h3 className={`font-bold text-md mb-1 ${
                      isHighRisk ? 'text-red-700' : isMediumRisk ? 'text-amber-800' : 'text-green-800'
                    }`}>행동 가이드</h3>
                    <p className="text-slate-700 text-sm leading-relaxed">{result.actionGuide}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* External Verification & Share */}
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleShareResult}
                className="col-span-2 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition active:scale-95 text-lg"
              >
                <Share2 className="w-6 h-6" />
                분석 결과 공유하기 (앱 포함)
              </button>
              
              <a 
                href={`https://www.google.com/search?q=${result.normalizedNumber}`} 
                target="_blank" 
                rel="noreferrer"
                className="bg-white border border-slate-200 p-3 rounded-xl font-bold text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-50 transition"
              >
                <Globe className="w-4 h-4 text-blue-500" />
                구글 검색
              </a>

              <a 
                href="https://thecheat.co.kr/" 
                target="_blank" 
                rel="noreferrer"
                className="bg-white border border-slate-200 p-3 rounded-xl font-bold text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-50 transition"
              >
                <ShieldAlert className="w-4 h-4 text-red-500" />
                더치트 확인
              </a>
            </div>

            {/* Details Cards */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center border-b pb-3 border-slate-100">
                  <div className="w-1.5 h-6 bg-blue-500 rounded-full mr-3"></div>
                  AI 3줄 요약
                </h3>
                <ul className="space-y-4">
                  {result.summary.map((item, idx) => (
                    <li key={idx} className="flex items-start">
                      <div className="bg-blue-50 rounded-full p-1 mr-3 mt-0.5 flex-shrink-0">
                        <ChevronRight className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-slate-700 font-medium leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center border-b pb-3 border-slate-100">
                  <div className="w-1.5 h-6 bg-slate-700 rounded-full mr-3"></div>
                  상세 분석 근거
                </h3>
                <ul className="space-y-3">
                  {result.details.map((item, idx) => (
                    <li key={idx} className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 flex gap-3">
                      <span className="font-bold text-slate-400 select-none">{idx + 1}.</span>
                      {item}
                    </li>
                  ))}
                </ul>
            </div>

            <div className="bg-slate-800 text-slate-300 p-5 rounded-2xl shadow-lg text-center border-t-4 border-slate-600 text-sm">
              <p className="font-medium">"{result.closingMessage}"</p>
            </div>
          </div>
        )}

        {/* Dashboard Icons (Idle State) */}
        {status === AnalysisStatus.IDLE && (
           <div className="grid grid-cols-3 gap-3 md:gap-4 text-center animate-fade-in mb-12">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-red-50 rounded-full flex items-center justify-center mb-2 text-red-500">
                <ShieldAlert className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <span className="text-xs font-bold text-slate-600">위험 탐지</span>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-full flex items-center justify-center mb-2 text-blue-500">
                <Siren className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <span className="text-xs font-bold text-slate-600">패턴 분석</span>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-green-50 rounded-full flex items-center justify-center mb-2 text-green-500">
                <Shield className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <span className="text-xs font-bold text-slate-600">안전 확인</span>
            </div>
          </div>
        )}

        {/* Info Cards (Always visible at bottom) */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-800 px-2 flex items-center gap-2">
            <Info className="w-5 h-5 text-slate-400" />
            알아두면 좋은 정보
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* How to Use */}
            <div className="bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-800 h-full">
               <div className="flex items-center gap-3 mb-4">
                  <div className="bg-slate-800 p-2 rounded-lg border border-slate-700">
                    <Search className="w-6 h-6 text-blue-400" />
                  </div>
                  <h4 className="font-bold text-lg text-white">사용 방법</h4>
               </div>
               <ol className="space-y-3 text-slate-300 text-sm">
                  <li className="flex gap-2">
                    <span className="font-bold text-blue-400">1.</span>
                    모르는 번호나 의심스러운 번호를 입력창에 입력하세요.
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-blue-400">2.</span>
                    [검사] 버튼을 누르면 AI가 3초 내에 위험도를 분석합니다.
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-blue-400">3.</span>
                    빨간색 '고위험' 결과가 나오면 절대 전화를 받지 마세요.
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-blue-400">4.</span>
                    결과를 가족이나 지인에게 공유하여 피해를 예방하세요.
                  </li>
               </ol>
            </div>

            {/* Prevention Tips */}
            <div className="bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-800 h-full">
               <div className="flex items-center gap-3 mb-4">
                  <div className="bg-slate-800 p-2 rounded-lg border border-slate-700">
                    <Lock className="w-6 h-6 text-red-400" />
                  </div>
                  <h4 className="font-bold text-lg text-white">피싱 예방 5계명</h4>
               </div>
               <ul className="space-y-3 text-slate-300 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>출처가 불분명한 문자 내 <strong className="text-white">URL 클릭 금지</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>검찰/금감원은 <strong className="text-white">전화로 돈을 요구하지 않음</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>가족 사칭 문자 시 반드시 <strong className="text-white">직접 전화로 확인</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>스마트폰 보안 설정 강화 및 <strong className="text-white">백신 앱 설치</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>피해 발생 시 즉시 <strong className="text-white">112 또는 118 신고</strong></span>
                  </li>
               </ul>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-slate-100 border-t border-slate-200 py-8 text-center text-slate-500 text-sm mt-8">
        <div className="max-w-3xl mx-auto px-4">
          <p className="font-bold text-slate-600 mb-2">PhishGuard AI</p>
          <p className="mb-4">
            본 서비스는 Google Gemini AI를 활용하여 제공됩니다.<br/>
            분석 결과는 참고용이며, 실제 피해 발생 시 수사기관에 신고하세요.
          </p>
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} PhishGuard AI. All rights reserved.
          </p>
        </div>
      </footer>

      {/* --- MODALS --- */}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-600" />
                설정
              </h3>
              <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-slate-200 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">나만의 API Key (선택)</label>
              <p className="text-xs text-slate-500 mb-4">
                무료 사용량이 초과되거나 오류가 발생할 경우, Google AI Studio에서 발급받은 본인의 Gemini API Key를 입력하세요. 입력된 키는 브라우저에만 저장됩니다.
              </p>
              <input 
                type="password" 
                value={apiKey} 
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full border rounded-lg p-3 mb-6 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="AIzaSy..."
              />
              <button onClick={saveApiKey} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition flex items-center justify-center gap-2 mb-4">
                <Save className="w-4 h-4" />
                저장하기
              </button>

              <div className="border-t pt-4 mt-2">
                 <button 
                   onClick={() => setShowAdminLogin(true)}
                   className="w-full text-slate-400 text-xs hover:text-slate-600 transition flex items-center justify-center gap-1 py-2"
                 >
                   <Settings className="w-3 h-3" />
                   관리자 모드 진입
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
           <div className="bg-white w-full max-w-xs rounded-2xl shadow-2xl p-6">
              <h3 className="font-bold text-lg mb-4 text-center">관리자 인증</h3>
              <input 
                 type="password" 
                 placeholder="비밀번호 (1234)" 
                 value={adminPassword}
                 onChange={(e) => setAdminPassword(e.target.value)}
                 className="w-full border rounded-lg p-3 mb-4 text-center"
              />
              <div className="flex gap-2">
                 <button onClick={() => setShowAdminLogin(false)} className="flex-1 bg-slate-100 py-2 rounded-lg text-sm font-bold text-slate-600">취소</button>
                 <button onClick={handleAdminLogin} className="flex-1 bg-blue-600 py-2 rounded-lg text-sm font-bold text-white">확인</button>
              </div>
           </div>
        </div>
      )}

      {/* Admin Panel Modal (Manage Apps) */}
      {showAdminPanel && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
           <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden h-[80vh] flex flex-col">
              <div className="p-4 border-b flex justify-between items-center bg-slate-800 text-white">
                 <h3 className="font-bold text-lg">추천 앱 관리</h3>
                 <button onClick={() => setShowAdminPanel(false)}><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 flex-grow overflow-y-auto bg-slate-50">
                 {/* Add New App Form */}
                 <div className="bg-white p-4 rounded-xl shadow-sm border mb-6">
                    <h4 className="font-bold text-sm text-slate-700 mb-3 flex items-center gap-2">
                       <Plus className="w-4 h-4" /> 앱 추가하기
                    </h4>
                    <input 
                       type="text" 
                       placeholder="앱 이름" 
                       value={newAppTitle}
                       onChange={(e) => setNewAppTitle(e.target.value)}
                       className="w-full border rounded-lg p-2 mb-2 text-sm"
                    />
                    <input 
                       type="text" 
                       placeholder="앱 설명" 
                       value={newAppDesc}
                       onChange={(e) => setNewAppDesc(e.target.value)}
                       className="w-full border rounded-lg p-2 mb-3 text-sm"
                    />
                    <button onClick={handleAddApp} className="w-full bg-slate-800 text-white py-2 rounded-lg text-sm font-bold hover:bg-slate-700">추가</button>
                 </div>

                 {/* App List */}
                 <h4 className="font-bold text-sm text-slate-700 mb-3">등록된 앱 목록 ({apps.length})</h4>
                 <div className="space-y-3">
                    {apps.map(app => (
                       <div key={app.id} className="bg-white p-3 rounded-xl border flex justify-between items-start shadow-sm">
                          <div>
                             <div className="font-bold text-slate-800 text-sm">{app.title}</div>
                             <div className="text-xs text-slate-500">{app.description}</div>
                          </div>
                          <button onClick={() => handleDeleteApp(app.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg">
                             <Trash2 className="w-4 h-4" />
                          </button>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50 flex-shrink-0">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-slate-600" />
                최근 검색 기록
              </h3>
              <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-slate-200 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-grow space-y-3">
              {history.length === 0 ? (
                <p className="text-center text-slate-400 py-10">기록이 없습니다.</p>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="border p-4 rounded-xl hover:bg-slate-50 transition cursor-pointer" onClick={() => {
                    setResult(item);
                    setStatus(AnalysisStatus.SUCCESS);
                    setShowHistory(false);
                  }}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-lg text-slate-800">{item.normalizedNumber}</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        item.riskScore >= 70 ? 'bg-red-100 text-red-700' :
                        item.riskScore >= 40 ? 'bg-amber-100 text-amber-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {item.riskScore}점
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">{new Date(item.timestamp).toLocaleString()}</p>
                    <p className="text-sm text-slate-600 line-clamp-1">{item.category}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-red-50">
              <h3 className="font-bold text-lg flex items-center gap-2 text-red-700">
                <FileWarning className="w-5 h-5" />
                피싱 번호 신고
              </h3>
              <button onClick={() => setShowReport(false)} className="p-1 hover:bg-red-200 rounded-full">
                <X className="w-5 h-5 text-red-700" />
              </button>
            </div>
            <form onSubmit={handleReport} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-700 mb-2">신고할 전화번호</label>
                <input 
                  type="tel" 
                  required
                  value={reportNumber}
                  onChange={(e) => setReportNumber(e.target.value)}
                  className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="번호 입력"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">유형 선택</label>
                <div className="flex gap-2">
                   <button 
                    type="button"
                    onClick={() => setReportType('phishing')}
                    className={`flex-1 py-3 rounded-lg border font-bold text-sm transition ${
                      reportType === 'phishing' 
                      ? 'bg-red-600 text-white border-red-600' 
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                   >
                     보이스피싱/스팸
                   </button>
                   <button 
                    type="button"
                    onClick={() => setReportType('invalid')}
                    className={`flex-1 py-3 rounded-lg border font-bold text-sm transition ${
                      reportType === 'invalid' 
                      ? 'bg-slate-800 text-white border-slate-800' 
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                   >
                     없는 번호
                   </button>
                </div>
              </div>
              <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl font-bold shadow-lg transition">
                신고 접수하기
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Menu Modal (Recommendation & Share App) */}
      {showMenu && (
        <div className="fixed inset-0 z-50 flex items-start justify-start animate-fade-in">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMenu(false)}></div>
           <div className="relative bg-white h-full w-80 shadow-2xl p-6 flex flex-col">
              <div className="flex justify-between items-center mb-8">
                 <h2 className="text-xl font-black text-slate-900">메뉴</h2>
                 <button onClick={() => setShowMenu(false)}><X className="w-6 h-6 text-slate-400" /></button>
              </div>
              
              <div className="mb-6">
                 <button 
                   onClick={handleShareApp}
                   className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition"
                 >
                   <Share2 className="w-5 h-5 text-blue-600" />
                   이 앱을 지인에게 공유하기
                 </button>
              </div>

              <h3 className="font-bold text-slate-500 text-sm mb-4 uppercase tracking-wider">추천 앱 더보기</h3>
              <div className="space-y-4 overflow-y-auto flex-grow">
                 {apps.map(app => (
                   <div key={app.id} className="p-4 border rounded-xl hover:shadow-md transition cursor-pointer group">
                      <div className="flex items-center gap-3 mb-2">
                         <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
                            <Smartphone className="w-6 h-6" />
                         </div>
                         <h3 className="font-bold text-slate-800">{app.title}</h3>
                      </div>
                      <p className="text-sm text-slate-500">{app.description}</p>
                   </div>
                 ))}
              </div>

              <div className="mt-4 pt-4 border-t text-xs text-slate-400 text-center">
                 &copy; 2025 PhishGuard AI.
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default App;