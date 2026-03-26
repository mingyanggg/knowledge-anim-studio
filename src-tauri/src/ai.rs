use serde::{Deserialize, Serialize};

/// AI 生成脚本的请求参数
#[derive(Debug, Serialize, Deserialize)]
pub struct AiGenerateParams {
    /// 知识点描述
    pub description: String,
    /// 风格预设 ID
    pub style: String,
}

/// AI 生成脚本的返回结果
#[derive(Debug, Serialize, Deserialize)]
pub struct AiGenerateResult {
    /// 生成的 Python 动画脚本
    pub script: String,
    /// 场景拆分计划
    pub scenes: Vec<ScenePlan>,
}

/// 单个场景计划
#[derive(Debug, Serialize, Deserialize)]
pub struct ScenePlan {
    /// 场景序号
    pub index: usize,
    /// 场景标题
    pub title: String,
    /// 场景简述
    pub description: String,
    /// 预计时长（秒）
    pub duration: usize,
}

/// 调用 AI（Gemini CLI）生成动画脚本
///
/// 当前为 mock 实现，后续接入真实 Gemini CLI 调用。
#[tauri::command]
pub async fn generate_animation_script(params: AiGenerateParams) -> Result<AiGenerateResult, String> {
    let desc = &params.description;

    // Mock 示例脚本（后续替换为 gemini CLI 调用）
    let script = format!(
        r#"from manim import *

class KnowledgeAnimation(Scene):
    """自动生成的知识动画脚本

    主题: {desc}
    风格: {style}
    """

    def construct(self):
        # === 场景 1：标题展示 ===
        title = Text(
            "{title}",
            font_size=48,
            color=BLUE
        )
        title.scale_to_fit_width(config.frame_width * 0.85)
        self.play(Write(title), run_time=1.5)
        self.wait(1)

        # === 场景 2：核心概念 ===
        self.play(FadeOut(title))

        concept = MathTex(r"E = mc^{{2}}", font_size=64)
        concept.shift(UP * 0.5)

        explanation = Text(
            "能量 = 质量 × 光速²",
            font_size=32,
            color=GREY_B
        ).next_to(concept, DOWN, buff=0.8)

        self.play(Write(concept), run_time=2)
        self.play(FadeIn(explanation), shift=UP * 0.3)
        self.wait(2)

        # === 场景 3：可视化 ===
        self.play(
            FadeOut(concept),
            FadeOut(explanation),
        )

        # 绘制示意图
        circle = Circle(radius=2, color=YELLOW)
        dot = Dot(ORIGIN, color=RED, radius=0.1)
        label = Text("核心概念", font_size=28, color=WHITE)
        label.next_to(circle, DOWN, buff=0.5)

        self.play(Create(circle), run_time=1.5)
        self.play(FadeIn(dot), run_time=0.5)
        self.play(Write(label), run_time=0.8)
        self.wait(1.5)

        # === 场景 4：总结 ===
        self.play(
            FadeOut(circle),
            FadeOut(dot),
            FadeOut(label),
        )

        summary = Text(
            "谢谢观看！",
            font_size=52,
            color=GREEN
        )
        self.play(Write(summary), run_time=1.5)
        self.wait(2)
"#,
        desc = desc.chars().take(80).collect::<String>(),
        style = params.style,
        title = desc.chars().take(30).collect::<String>(),
    );

    // Mock 场景拆分
    let scenes = vec![
        ScenePlan {
            index: 1,
            title: "标题展示".to_string(),
            description: "动画开场，展示知识点标题".to_string(),
            duration: 3,
        },
        ScenePlan {
            index: 2,
            title: "核心概念".to_string(),
            description: "展示核心公式或概念".to_string(),
            duration: 5,
        },
        ScenePlan {
            index: 3,
            title: "可视化说明".to_string(),
            description: "通过图形动画直观解释概念".to_string(),
            duration: 5,
        },
        ScenePlan {
            index: 4,
            title: "总结".to_string(),
            description: "回顾要点，结束动画".to_string(),
            duration: 4,
        },
    ];

    Ok(AiGenerateResult { script, scenes })
}

/// 导出脚本为 .py 文件
#[tauri::command]
pub async fn export_script_file(
    script: String,
    filename: String,
) -> Result<String, String> {
    // Mock：后续用 Tauri dialog + fs API 真正写文件
    let _ = (&script, &filename);
    Ok(format!("已保存: {}", filename))
}
