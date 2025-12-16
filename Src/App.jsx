import React, { useState } from 'react';
import { Video, Camera, Save, Camera as ScreenshotIcon, FileText, CheckCircle, AlertTriangle, RefreshCcw, TrendingUp, TrendingDown, Armchair } from 'lucide-react';

// =========================================================================
// I. 向量數學工具 (Vector Math Utilities) - 實現報告中的步驟
// =========================================================================

// 向量相減 (a - b)
const subtract = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
// 向量相加 (a + b)
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
// 向量點積
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
// 向量叉積 (a x b) - 用於計算矢狀面法向量
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
];
// 向量模長 (Norm)
const norm = (v) => Math.sqrt(dot(v, v));
// 向量正規化 (Normalize)
const normalize = (v) => {
    const n = norm(v);
    return n === 0 ? [0, 0, 0] : [v[0] / n, v[1] / n, v[2] / n];
};

/**
 * 將向量 V 投影到以 N_Sagittal 為法向量的平面上。
 * @param {number[]} V - 要投影的向量 (e.g., V_Arm)
 * @param {number[]} N_Sagittal - 矢狀面的法向量
 * @returns {number[]} - 投影後的向量
 */
const projectOntoPlane = (V, N_Sagittal) => {
    const N_unit = normalize(N_Sagittal);
    const V_dot_N = dot(V, N_unit);
    // V_parallel = (V . N_unit) * N_unit
    const V_parallel = [
        V_dot_N * N_unit[0],
        V_dot_N * N_unit[1],
        V_dot_N * N_unit[2]
    ];
    // V_proj = V - V_parallel
    return subtract(V, V_parallel);
};


/**
 * 根據報告中的步驟，計算手臂擺動角度。
 * @param {object} keypoints - 3D 關鍵點座標 { PRS, PLS, PRH, PLH, PRE }
 * @returns {object} - { angle: number (度), direction: string (前擺/後甩) }
 */
const calculateArmAngle = (keypoints) => {
    const { PRS, PLS, PRH, PLH, PRE } = keypoints;
    
    // 步驟 1: 建立軀幹中心線向量 V_Axis (從髖部中心到肩膀中心)
    const PS_Mid = [(PRS[0] + PLS[0]) / 2, (PRS[1] + PLS[1]) / 2, (PRS[2] + PLS[2]) / 2];
    const PH_Mid = [(PRH[0] + PLH[0]) / 2, (PRH[1] + PLH[1]) / 2, (PRH[2] + PLH[2]) / 2];
    const V_Axis = subtract(PS_Mid, PH_Mid);
    
    // 步驟 2: 定義矢狀面法向量 N_Sagittal
    const V_Shoulder = subtract(PRS, PLS); // 雙肩連線向量 (冠狀面軸線)
    const N_Sagittal = cross(V_Shoulder, V_Axis); // 矢狀面法向量 (垂直於冠狀面和軀幹軸線)
    if (norm(N_Sagittal) === 0) return { angle: 0, direction: 'Error' }; 

    // 步驟 3: 建立手臂向量 V_Arm (右肩到右肘)
    const V_Arm = subtract(PRE, PRS);

    // 步驟 4: 向量投影至矢狀面
    // 我們將手臂向量 V_Arm 投影到與矢狀面垂直的平面上，再用 V_Arm 減去這個投影，得到 V_Arm_proj
    const V_Arm_proj = projectOntoPlane(V_Arm, N_Sagittal);
    const V_Axis_proj = projectOntoPlane(V_Axis, N_Sagittal);

    // 步驟 5: 計算夾角 $\theta$ (點積)
    const V_Arm_norm = norm(V_Arm_proj);
    const V_Axis_norm = norm(V_Axis_proj);

    if (V_Arm_norm < 0.01 || V_Axis_norm < 0.01) return { angle: 0, direction: 'Neutral' }; 

    let cosTheta = dot(V_Arm_proj, V_Axis_proj) / (V_Arm_norm * V_Axis_norm);
    cosTheta = Math.max(-1, Math.min(1, cosTheta));
    
    const angleRad = Math.acos(cosTheta);
    let angleDeg = angleRad * (180 / Math.PI);

    // 角度判斷（前擺/後甩）
    // 判斷手臂向量 V_Arm_proj 相對於軀幹軸線 V_Axis_proj 的前後方向。
    // 定義 V_Front (在矢狀面上的向量，垂直於 V_Axis_proj，代表身體前方)
    // 由於 V_Axis 指向上，N_Sagittal 指向左或右 (取決於叉積順序)，V_Front = V_Axis x N_Sagittal 將指向前方 (或後方)
    const V_Front = cross(V_Axis_proj, N_Sagittal); 
    
    // 檢查手臂向量 V_Arm_proj 在 V_Front 上的投影方向 (Dot Product Sign)
    const frontBackDot = dot(V_Arm_proj, V_Front);
    
    let direction = '中性 (Neutral)';

    // 將角度轉換為 0-180 度的擺動角
    
    // 判斷前後方向
    if (frontBackDot > 0.1) {
        direction = '前擺 (推進)';
    } else if (frontBackDot < -0.1) {
        direction = '後甩 (後擺)';
    }

    // 簡化角度展示：由於我們計算的是手臂向量與軸線向量的夾角，
    // 對於跑步姿勢，通常以軀幹為 90 度參考，這裡直接使用 180-angleDeg 只是簡化展示。
    // 在實際應用中，需要額外定義一個水平參考向量來計算相對於水平線的角度。
    // 在此模擬中，我們主要呈現計算結果和方向。

    return { 
        angle: Math.round(angleDeg * 10) / 10, // 保持輸出 0-180 度的夾角
        direction: direction 
    };
};

// =========================================================================
// II. 模擬數據與組件 (Mock Data and Component)
// =========================================================================

// 模擬的 3D 關鍵點數據 (X, Y, Z) - 假設 Y 軸是向上，Z 軸是鏡頭深度
// 軀幹在 (0, 0, 0) 附近
const MOCK_KEYPOINTS_FRONT_SWING = { // 模擬前擺/推進 (Z=0.3 向前)
    PRS: [-0.1, 0.9, 0.0],   // 右肩
    PLS: [0.1, 0.9, 0.0],    // 左肩
    PRH: [-0.1, 0.0, 0.0],   // 右髖
    PLH: [0.1, 0.0, 0.0],    // 左髖
    PRE: [-0.1, 0.5, 0.3],   // 右肘
};

const MOCK_KEYPOINTS_BACK_SWING = { // 模擬後甩/後擺 (Z=-0.3 向後)
    PRS: [-0.1, 0.9, 0.0],
    PLS: [0.1, 0.9, 0.0],
    PRH: [-0.1, 0.0, 0.0],
    PLH: [0.1, 0.0, 0.0],
    PRE: [-0.1, 0.5, -0.3],  // 右肘
};

const MOCK_KEYPOINTS_NEUTRAL = { // 模擬中性/手下垂 (Z接近 0, Y軸向下)
    PRS: [-0.1, 0.9, 0.0],
    PLS: [0.1, 0.9, 0.0],
    PRH: [-0.1, 0.0, 0.0],
    PLH: [0.1, 0.0, 0.0],
    PRE: [-0.1, 0.3, 0.0],  // 右肘
};


const App = () => {
  const [aiStatus, setAiStatus] = useState('Ready');
  const [isLiveCamera, setIsLiveCamera] = useState(false);
  const [currentGesture, setCurrentGesture] = useState({ 
      angle: calculateArmAngle(MOCK_KEYPOINTS_NEUTRAL).angle, 
      direction: calculateArmAngle(MOCK_KEYPOINTS_NEUTRAL).direction 
  });
  
  // 根據計算結果更新 UI 顏色和圖示
  const isGrabbing = currentGesture.direction.includes('前擺');
  const isSlinging = currentGesture.direction.includes('後甩');
  const gestureColor = isGrabbing ? 'bg-green-500' : (isSlinging ? 'bg-orange-500' : 'bg-gray-500');

  const handleAction = (action) => {
    console.log(`執行操作: ${action}`);
    if (action === '啟動即時鏡頭' || action === '停止即時鏡頭') {
      setIsLiveCamera(prev => !prev);
    }
    
    // 模擬手勢數據切換和角度計算
    if (action === '模擬數據 (計算角度)') {
      let newKeypoints;
      
      // 依序切換：中性 -> 前擺 -> 後甩 -> 中性
      if (currentGesture.direction.includes('前擺')) {
          newKeypoints = MOCK_KEYPOINTS_BACK_SWING;
      } else if (currentGesture.direction.includes('後甩')) {
          newKeypoints = MOCK_KEYPOINTS_NEUTRAL;
      } else {
          newKeypoints = MOCK_KEYPOINTS_FRONT_SWING;
      }

      const newGesture = calculateArmAngle(newKeypoints);
      setCurrentGesture(newGesture);
      console.log("Calculated Angle:", newGesture.angle, newGesture.direction);
    }
    
    // 模擬報告生成
    if (action === '取得AI姿勢報告') {
        setAiStatus('Analyzing');
        setTimeout(() => setAiStatus('Report Ready'), 2000);
    }
  };

  // 根據狀態設定 AI 狀態顯示
  const getAiStatusDisplay = () => {
    let color = 'text-gray-400';
    let icon = <AlertTriangle size={18} className="mr-1" />;

    if (aiStatus === 'Ready' || aiStatus === 'Report Ready') {
      color = 'text-green-400';
      icon = <CheckCircle size={18} className="mr-1" />;
    } else if (aiStatus === 'Analyzing') {
      color = 'text-yellow-400 animate-pulse';
      icon = <RefreshCcw size={18} className="mr-1 animate-spin" />;
    } else if (aiStatus === 'Error') {
      color = 'text-red-400';
      icon = <AlertTriangle size={18} className="mr-1" />;
    }

    return (
      <div className="flex items-center text-sm ml-2">
        <span className="text-gray-300 font-medium mr-1 whitespace-nowrap">AI Status:</span>
        <span className={`flex items-center font-bold ${color} whitespace-nowrap`}>
          {icon} {aiStatus}
        </span>
      </div>
    );
  };

  // 統一的按鈕樣式
  const Button = ({ icon: Icon, label, action, color = 'bg-indigo-600' }) => (
    <button
      onClick={() => handleAction(action)}
      className={`flex items-center px-3 py-2 text-sm font-medium text-white rounded-lg transition duration-200 
                  ${color} hover:opacity-80 shadow-md transform hover:scale-[1.02] active:scale-100 whitespace-nowrap`}
      aria-label={label}
    >
      <Icon size={18} className="mr-1" />
      {label}
    </button>
  );

  // 手勢狀態顯示窗格 (現在包含角度數據)
  const GestureWindow = ({ label, currentAngle, isCurrent, direction, targetDirection }) => {
    const Icon = targetDirection === '前擺' ? TrendingUp : (targetDirection === '後甩' ? TrendingDown : Armchair);
    const isActive = direction.includes(targetDirection) && !direction.includes('Neutral');
    const displayAngle = isActive ? currentAngle.toFixed(1) + '°' : '--';

    return (
        <div className={`flex flex-col items-start px-3 py-1.5 text-xs font-bold rounded-xl transition duration-300 min-w-[120px] 
                        ${isActive ? gestureColor : 'bg-gray-700 text-gray-400'} shadow-inner`}>
            <span className="text-gray-300 mb-0.5">{label}</span>
            <div className={`flex items-center ${isActive ? 'text-white' : 'text-gray-400'}`}>
                <Icon size={14} className="mr-1" />
                <span className="text-base font-extrabold">{displayAngle}</span>
                <span className="ml-1 font-medium text-xs">{targetDirection}</span>
            </div>
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center p-4 font-sans">
      
      {/* 標題 */}
      <h1 className="text-3xl font-extrabold text-white mb-6 mt-4">AI 動作分析控制台</h1>

      {/* 核心佈局：所有元素在一條線上，由左至右依序排列 */}
      <div className="w-full max-w-full bg-gray-800 rounded-xl shadow-2xl p-4 overflow-x-auto">
        <div className="flex items-center w-full space-x-3 p-1 min-w-[1000px]"> 
          
          {/* 1. 前擺(推進) 視窗 - 顯示計算角度 */}
          <GestureWindow 
              label="動作角度" 
              currentAngle={currentGesture.angle}
              isCurrent={isGrabbing}
              direction={currentGesture.direction}
              targetDirection="前擺"
          />
          
          {/* 2. 後甩(後擺) 視窗 - 顯示計算角度 */}
          <GestureWindow 
              label="動作角度" 
              currentAngle={currentGesture.angle}
              isCurrent={isSlinging}
              direction={currentGesture.direction}
              targetDirection="後甩"
          />
          
          {/* 3. (選擇影片檔案) 按鈕 */}
          <Button icon={Video} label="選擇影片檔案" action="選擇影片檔案" color="bg-gray-600" />
          
          {/* 4. (啟動/停止即時鏡頭) 按鈕 */}
          <Button 
              icon={Camera} 
              label={isLiveCamera ? "停止即時鏡頭" : "啟動即時鏡頭"} 
              action={isLiveCamera ? "停止即時鏡頭" : "啟動即時鏡頭"} 
              color={isLiveCamera ? 'bg-red-600' : 'bg-green-600'}
          />
          
          {/* 5. (儲存帶有分析的影片) 按鈕 - 點擊此按鈕模擬 AI 數據更新並計算角度 */}
          <Button 
              icon={RefreshCcw} 
              label="模擬數據 (計算角度)" 
              action="模擬數據 (計算角度)" 
              color="bg-blue-600" 
          />
          
          {/* 6. (截圖) 按鈕 */}
          <Button icon={ScreenshotIcon} label="截圖" action="截圖" color="bg-purple-600" />
          
          {/* 7. (取得AI姿勢報告) 按鈕 */}
          <Button 
              icon={FileText} 
              label="取得AI姿勢報告" 
              action="取得AI姿勢報告" 
              color="bg-yellow-600" 
          />

          {/* 8. (AI Status:) 狀態顯示 */}
          {getAiStatusDisplay()}
        </div>
      </div>

      {/* 模擬的視訊/分析區 (佔位符) */}
      <div className="w-full max-w-7xl mt-6 bg-gray-700 h-96 rounded-xl flex flex-col items-center justify-center shadow-inner p-4">
        <p className="text-gray-300 text-xl font-mono mb-2">
            視訊播放與姿勢骨架繪製區域
        </p>
        <p className="text-gray-400 text-lg">
            當前計算角度: <span className="font-bold text-white">{currentGesture.angle}°</span> ({currentGesture.direction})
        </p>
        <p className="mt-4 text-gray-400 text-sm">
            點擊「模擬數據 (計算角度)」按鈕來觸發報告中定義的 3D 向量計算邏輯。
            <br/>
            每次點擊將依序模擬：**前擺** $\rightarrow$ **後甩** $\rightarrow$ **中性**。
        </p>
      </div>
    </div>
  );
};

export default App;