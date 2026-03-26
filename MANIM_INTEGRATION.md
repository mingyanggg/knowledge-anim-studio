# Manim 集成方案

## 现状
`src-tauri/src/manim.rs` 中 4 个函数均为 mock，本地未安装 manim。

## 环境
- Python 3.14 已安装（`/opt/homebrew/bin/python3`）
- manim 需要 `pip install manim`，建议用虚拟环境隔离

## 集成架构

```rust
// manim.rs 核心调用链
pub async fn generate_animation(input: &str, format: OutputFormat) -> Result<Output> {
    // 1. 写入临时 .py 文件（Manim 脚本模板）
    // 2. 调用 python3 -m manim render -q[lmp] temp.py SceneName
    // 3. 等待子进程完成，读取输出文件
    // 4. 清理临时文件，返回 Output
}

// 支持的格式：
// - mp4: -ql（低）/ -qm（中）/ -qh（高）/ -qk（4K）
// - gif: 需要 pip install manim pillow，加 --format gif
```

## 脚本模板
```
from manim import *
class {SceneName}(Scene):
    def construct(self):
        {user_code}
```

## 安全注意
- 子进程沙箱：限制文件系统访问（chroot 或 restricted）
- 超时控制：`Command::new().timeout(Duration::from_secs(120))`
- 输入校验：禁止 `import os` / `exec` / `eval` 等危险调用

## 安装步骤
```bash
python3 -m venv ~/.manim-venv
source ~/.manim-venv/bin/activate
pip install manim
# 验证
manim --version
```

## 优先级
先实现基础流程（写文件→调用→读结果），动画模板后续迭代。
