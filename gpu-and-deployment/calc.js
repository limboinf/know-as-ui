/* gpu-and-deployment 四页共享计算常量与公式 —— a/b/c/d 唯一数据源。
   页面通过 window.GPU_CALC 取数，禁止在页面里另立一套硬件数字；
   若核实后发现某数字有误，在页面行文里注明并在交付报告里勘误，由维护者统一改这里。
   所有数字为 2026-09 量级估算（官方 datasheet / 常见云价），展示时保留「约 / ≈」口径。 */
window.GPU_CALC = (function () {
  'use strict';

  const DATA_CUTOFF = '2026-09';

  /* ---------- 精度 → 每参数字节数 ---------- */
  const PRECISIONS = {
    fp32: { label: 'FP32',       bytes: 4,   note: '训练主权重口径' },
    bf16: { label: 'BF16/FP16',  bytes: 2,   note: '训练/推理主力精度' },
    fp8:  { label: 'FP8/INT8',   bytes: 1,   note: '数据中心推理新贵' },
    int4: { label: 'INT4/NF4',   bytes: 0.5, note: '本地部署 / QLoRA 存放' },
  };
  function bytesPerParam(precision) { return PRECISIONS[precision].bytes; }

  /* ---------- 显卡预设（量级） ----------
     vramGB：Mac 为统一内存可用上限（macOS 默认给 GPU 约 75%）；cloudUsdHr 为 on-demand 常见量级，随市场波动。 */
  const GPUS = [
    { id: 'm4max',   name: 'M4 Max 128G（统一内存）', vramGB: 96,  bwGBs: 546,  bf16Tflops: null, tdpW: null, cloudUsdHr: null, kind: 'apple', note: '能装得下、安静省电；带宽低，decode 慢一档' },
    { id: 'rtx4090', name: 'RTX 4090',  vramGB: 24,  bwGBs: 1008, bf16Tflops: 165,  tdpW: 450,  cloudUsdHr: 0.4 },
    { id: 'rtx5090', name: 'RTX 5090',  vramGB: 32,  bwGBs: 1792, bf16Tflops: 210,  tdpW: 575,  cloudUsdHr: 0.65 },
    { id: 'a100',    name: 'A100 80G',  vramGB: 80,  bwGBs: 2039, bf16Tflops: 312,  tdpW: 400,  cloudUsdHr: 1.2 },
    { id: 'h100',    name: 'H100 SXM',  vramGB: 80,  bwGBs: 3350, bf16Tflops: 989,  tdpW: 700,  cloudUsdHr: 2.5 },
    { id: 'h200',    name: 'H200',      vramGB: 141, bwGBs: 4800, bf16Tflops: 989,  tdpW: 700,  cloudUsdHr: 3.2 },
    { id: 'b200',    name: 'B200',      vramGB: 192, bwGBs: 8000, bf16Tflops: 2250, tdpW: 1000, cloudUsdHr: 5.5 },
  ];

  /* ---------- 常用开源模型（Qwen2.5 / Llama-3 config.json 口径） ----------
     kvDim = num_kv_heads × head_dim；kvBytesPerToken 用它算 GQA 折扣后的实际开销。 */
  const MODELS = {
    qwen05b:  { id: 'qwen05b',  name: 'Qwen2.5-0.5B',  paramsB: 0.5,  hidden: 896,  layers: 24, kvDim: 128 },
    qwen15b:  { id: 'qwen15b',  name: 'Qwen2.5-1.5B',  paramsB: 1.5,  hidden: 1536, layers: 28, kvDim: 256 },
    qwen7b:   { id: 'qwen7b',   name: 'Qwen2.5-7B',    paramsB: 7.6,  hidden: 3584, layers: 28, kvDim: 512 },
    llama8b:  { id: 'llama8b',  name: 'Llama-3.1-8B',  paramsB: 8.0,  hidden: 4096, layers: 32, kvDim: 1024 },
    qwen14b:  { id: 'qwen14b',  name: 'Qwen2.5-14B',   paramsB: 14.8, hidden: 5120, layers: 48, kvDim: 1024 },
    qwen32b:  { id: 'qwen32b',  name: 'Qwen2.5-32B',   paramsB: 32.8, hidden: 5120, layers: 64, kvDim: 1024 },
    llama70b: { id: 'llama70b', name: 'Llama-3.3-70B', paramsB: 70.6, hidden: 8192, layers: 80, kvDim: 1024 },
    qwen72b:  { id: 'qwen72b',  name: 'Qwen2.5-72B',   paramsB: 72.7, hidden: 8192, layers: 80, kvDim: 1024 },
  };

  /* ---------- 推理侧 ---------- */
  // 权重显存 = 参数量(B) × 每参数字节 → 直接得 GB
  function weightGB(paramsB, precision) { return paramsB * bytesPerParam(precision); }

  // 每 token KV 字节 = 2(K和V) × 层数 × kvDim × 每元素字节（默认 BF16）
  function kvBytesPerToken(layers, kvDim, bytesPerElem) {
    return 2 * layers * kvDim * (bytesPerElem || 2);
  }

  // 总 KV = 并发 × 上下文 token 数 × 每 token 字节 → GB
  function kvTotalGB(concurrent, ctxTokens, bytesPerToken) {
    return (concurrent * ctxTokens * bytesPerToken) / 1e9;
  }

  // 运行时开销（CUDA 上下文 + 激活工作区，量级）：权重的 15% + 0.6GB 底数
  function overheadGB(weightGBVal) { return weightGBVal * 0.15 + 0.6; }

  // 标称显存 → 可用显存（保留 ~5% 系统占用；Mac 已按可用上限给出 vramGB）
  function usableVRAM(cardGB) { return cardGB * 0.95; }

  // 三档判定：over > 可用；tight > 85% 可用；ok 其余
  function verdict(needGB, availGB) {
    const ratio = needGB / availGB;
    const level = ratio > 1 ? 'over' : (ratio > 0.85 ? 'tight' : 'ok');
    return { level: level, ratio: ratio };
  }

  // decode 速度粗算：显存带宽 ÷ 权重量 = 每秒能「读完几遍权重」（理论上限，实际打 5~7 折）
  function decodeTps(bwGBs, weightGBVal) { return bwGBs / weightGBVal; }

  // 一步到位的推理显存估算（a/b/d 页估算器共用）
  function inferenceGB(model, precision, concurrent, ctxTokens) {
    const w = weightGB(model.paramsB, precision);
    const kvB = kvBytesPerToken(model.layers, model.kvDim, PRECISIONS[precision].bytes <= 1 ? 1 : 2);
    const kv = kvTotalGB(concurrent, ctxTokens, kvB);
    const oh = overheadGB(w);
    return { weight: w, kv: kv, overhead: oh, total: w + kv + oh, kvBytesPerToken: kvB };
  }

  /* ---------- 训练侧（混合精度 + AdamW 口径） ---------- */
  const TRAIN = {
    fullBytesPerParam: 16,     // 权重2 + 梯度2 + FP32主权重4 + Adam m4 + v4（不含激活）
    frozenBf16Bytes: 2,        // LoRA 冻结主干：只按推理精度存放
    frozenNf4Bytes: 0.5,       // QLoRA 冻结主干：NF4 存放
    trainableBytesPerParam: 16,// 可训练参数（LoRA 增量）同样吃 16 字节账单
    actBytesPerTokenNoCkpt: 34,// 激活/ token：34 × hidden × layers（Megatron 口径，量级）
    actBytesPerTokenCkpt: 2,   // 开 gradient checkpointing 后只存层输入
    defaultLoraTrainableRatio: 0.005, // r≈16 挂全部线性层的量级，UI 可调
  };

  // 激活显存（GB）：seqTokens = batch × 序列长度
  function activationGB(hidden, layers, seqTokens, withCheckpointing) {
    const per = withCheckpointing ? TRAIN.actBytesPerTokenCkpt : TRAIN.actBytesPerTokenNoCkpt;
    return (per * hidden * layers * seqTokens) / 1e9;
  }

  // 训练显存分账（GB）。method: 'full' | 'lora' | 'qlora'
  // opts: { trainableRatio, activationGB, batchTokens, withCheckpointing, hidden, layers }
  function trainBreakdownGB(paramsB, method, opts) {
    opts = opts || {};
    const act = opts.activationGB != null ? opts.activationGB
      : activationGB(opts.hidden || 5120, opts.layers || 48, opts.batchTokens || 4096, !!opts.withCheckpointing);
    let frozen = 0, weights = 0, grads = 0, optimizer = 0, trainable = 0;
    if (method === 'full') {
      weights = paramsB * 2; grads = paramsB * 2;
      optimizer = paramsB * 12; trainable = paramsB;
    } else {
      const frozenBytes = method === 'qlora' ? TRAIN.frozenNf4Bytes : TRAIN.frozenBf16Bytes;
      frozen = paramsB * frozenBytes;
      const ratio = opts.trainableRatio != null ? opts.trainableRatio : TRAIN.defaultLoraTrainableRatio;
      trainable = paramsB * ratio;
      grads = trainable * 2; optimizer = trainable * 14; // 增量：梯度2 + master4 + m4 + v4
    }
    const total = frozen + weights + grads + optimizer + act;
    return { frozen: frozen, weights: weights, gradients: grads, optimizer: optimizer, activations: act, trainableParamsB: trainable, total: total };
  }

  /* ---------- 成本侧 ---------- */
  // 自托管每百万输出 token 成本（USD）= 卡时价 ÷ (聚合吞吐 × 3600 × 利用率) × 1e6
  function costPerMTok(usdPerHour, aggTokensPerSec, utilization) {
    return usdPerHour / (aggTokensPerSec * 3600 * utilization) * 1e6;
  }

  /* ---------- 小工具 ---------- */
  function fmtGB(x) {
    if (!isFinite(x)) return '∞';
    if (x >= 100) return Math.round(x) + ' GB';
    if (x >= 10) return x.toFixed(1) + ' GB';
    return x.toFixed(2) + ' GB';
  }
  function fmtBytes(x) {
    if (x >= 1e6) return (x / 1e6).toFixed(2) + ' MB';
    if (x >= 1e3) return (x / 1e3).toFixed(1) + ' KB';
    return Math.round(x) + ' B';
  }
  function gpuById(id) { return GPUS.find(function (g) { return g.id === id; }); }
  function modelById(id) { return MODELS[id]; }

  return {
    DATA_CUTOFF: DATA_CUTOFF,
    PRECISIONS: PRECISIONS, GPUS: GPUS, MODELS: MODELS, TRAIN: TRAIN,
    bytesPerParam: bytesPerParam,
    weightGB: weightGB,
    kvBytesPerToken: kvBytesPerToken,
    kvTotalGB: kvTotalGB,
    overheadGB: overheadGB,
    usableVRAM: usableVRAM,
    verdict: verdict,
    decodeTps: decodeTps,
    inferenceGB: inferenceGB,
    activationGB: activationGB,
    trainBreakdownGB: trainBreakdownGB,
    costPerMTok: costPerMTok,
    fmtGB: fmtGB, fmtBytes: fmtBytes,
    gpuById: gpuById, modelById: modelById,
  };
})();
