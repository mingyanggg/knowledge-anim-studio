use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;

/// Path to the Manim virtual environment
const MANIM_VENV: &str = "/Users/michael/.manim-venv";
/// Path to the Manim Python executable
const MANIM_PYTHON: &str = "/Users/michael/.manim-venv/bin/python3";
/// Manim output directory
const MANIM_OUTPUT_DIR: &str = "/Users/michael/.knowledge-anim-output";
/// Maximum render time in seconds
const RENDER_TIMEOUT_SECS: u64 = 120;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ManimStatus {
    pub installed: bool,
    pub version: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GenerateParams {
    pub description: String,
    pub template_id: Option<String>,
    pub params: RenderParams,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RenderParams {
    pub primary_color: String,
    pub secondary_color: String,
    pub style: String,
    pub duration: u32,
    pub fps: u32,
    pub resolution: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RenderResult {
    pub success: bool,
    pub output_path: String,
    pub format: String,
    pub duration_secs: f64,
    pub log: String,
}

/// Check if Manim is installed and working
#[tauri::command]
pub async fn check_manim_installed() -> Result<ManimStatus, String> {
    let output = Command::new(MANIM_PYTHON)
        .args(["-c", "import manim; print(manim.__version__)"])
        .output()
        .map_err(|e| format!("Failed to run Python: {}", e))?;

    if output.status.success() {
        let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(ManimStatus {
            installed: true,
            version: Some(version),
        })
    } else {
        Ok(ManimStatus {
            installed: false,
            version: None,
        })
    }
}

/// Generate a Manim Python script (currently template-based, will use AI later)
#[tauri::command]
pub async fn generate_script(params: GenerateParams) -> Result<String, String> {
    let scene_name = "GeneratedScene";
    let primary = &params.params.primary_color;
    let secondary = &params.params.secondary_color;
    let desc = &params.description;

    let script = format!(
        r#"from manim import *

class {scene_name}(Scene):
    def construct(self):
        # Title
        title = Text("{title}", font_size=48)
        title.to_edge(UP)
        self.play(Write(title))
        self.wait(0.5)

        # Main visualization
        axes = Axes(
            x_range=[-5, 5, 1],
            y_range=[-3, 3, 1],
            axis_config={{"color": "{primary}"}},
        )

        # Graph
        graph = axes.plot(lambda x: x ** 2, color="{secondary}")
        graph_label = axes.get_graph_label(graph, label="f(x) = x²")

        self.play(Create(axes), run_time=1.5)
        self.play(Create(graph), run_time=1.5)
        self.play(Write(graph_label), run_time=0.5)

        # Animated point
        dot = Dot(color="{primary}")
        dot.move_to(axes.c2p(0, 0))
        self.play(FadeIn(dot))

        moving_dot = dot.copy()
        self.play(
            MoveAlongPath(moving_dot, graph),
            run_time={duration},
            rate_func=smooth,
        )
        self.play(FadeOut(moving_dot))

        # Area fill
        area = axes.get_area(graph, x_range=[-2, 2], color="{primary}", opacity=0.3)
        self.play(FadeIn(area))
        self.wait(0.5)
        self.play(FadeOut(area))

        # Conclusion
        self.play(FadeOut(graph), FadeOut(graph_label), FadeOut(axes))
        conclusion = Text("Knowledge Animation", font_size=36, color="{secondary}")
        conclusion.move_to(ORIGIN)
        self.play(Write(conclusion))
        self.wait(1)
        self.play(FadeOut(conclusion))
"#,
        scene_name = scene_name,
        title = if desc.is_empty() { "Knowledge Animation".to_string() } else { desc.chars().take(40).collect::<String>() },
        primary = primary,
        secondary = secondary,
        duration = params.params.duration,
    );

    Ok(script)
}

/// Render a Manim script to MP4
#[tauri::command]
pub async fn render_animation(script: String) -> Result<RenderResult, String> {
    // Create output directory
    std::fs::create_dir_all(MANIM_OUTPUT_DIR)
        .map_err(|e| format!("Failed to create output dir: {}", e))?;

    // Write script to temp file
    let script_path = PathBuf::from(MANIM_OUTPUT_DIR).join("temp_scene.py");
    std::fs::write(&script_path, &script)
        .map_err(|e| format!("Failed to write script: {}", e))?;

    let start = std::time::Instant::now();

    // Run Manim render
    let output = Command::new(MANIM_PYTHON)
        .args([
            "-m", "manim", "render",
            "-ql",                          // Low quality (fast)
            "--format", "mp4",
            "--media_dir", MANIM_OUTPUT_DIR,
            script_path.to_str().unwrap(),
            "GeneratedScene",
        ])
        .env("PYTHONIOENCODING", "utf-8")
        .output()
        .map_err(|e| format!("Failed to run Manim: {}", e))?;

    let elapsed = start.elapsed().as_secs_f64();

    if output.status.success() {
        // Find the output file
        let pattern = format!(
            "{}/videos/low_quality/480p15/GeneratedScene.mp4",
            MANIM_OUTPUT_DIR
        );
        let output_path = PathBuf::from(&pattern);

        let log = String::from_utf8_lossy(&output.stderr).to_string();

        if output_path.exists() {
            Ok(RenderResult {
                success: true,
                output_path: output_path.to_string_lossy().to_string(),
                format: "mp4".to_string(),
                duration_secs: elapsed,
                log,
            })
        } else {
            // Try to find the file with glob-like search
            let videos_dir = PathBuf::from(MANIM_OUTPUT_DIR).join("videos");
            if let Ok(entries) = std::fs::read_dir(&videos_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.extension().map_or(false, |e| e == "mp4") {
                        return Ok(RenderResult {
                            success: true,
                            output_path: path.to_string_lossy().to_string(),
                            format: "mp4".to_string(),
                            duration_secs: elapsed,
                            log,
                        });
                    }
                }
            }

            Err(format!("Render succeeded but output file not found. Log:\n{}", log))
        }
    } else {
        let log = String::from_utf8_lossy(&output.stderr).to_string();
        Err(format!("Manim render failed:\n{}", log))
    }
}

/// Export video to GIF using ffmpeg (via Manim)
#[tauri::command]
pub async fn export_gif(video_path: String) -> Result<String, String> {
    let output_path = PathBuf::from(&video_path)
        .with_extension("gif");

    let output = Command::new(MANIM_PYTHON)
        .args([
            "-m", "manim", "render",
            "--format", "gif",
            "-ql",
            "--media_dir", MANIM_OUTPUT_DIR,
            // Re-render from script
            &format!("{}/temp_scene.py", MANIM_OUTPUT_DIR),
            "GeneratedScene",
        ])
        .output()
        .map_err(|e| format!("GIF export failed: {}", e))?;

    if output.status.success() {
        // Find the GIF output
        let gif_dir = PathBuf::from(MANIM_OUTPUT_DIR).join("videos").join("low_quality").join("480p15");
        if let Ok(entries) = std::fs::read_dir(&gif_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().map_or(false, |e| e == "gif") {
                    return Ok(path.to_string_lossy().to_string());
                }
            }
        }
        Err("GIF render succeeded but file not found".to_string())
    } else {
        Err(format!("GIF export failed: {}", String::from_utf8_lossy(&output.stderr)))
    }
}

/// Copy output file to user-specified location
#[tauri::command]
pub async fn export_to_path(source_path: String, dest_path: String) -> Result<String, String> {
    std::fs::copy(&source_path, &dest_path)
        .map_err(|e| format!("Failed to copy file: {}", e))?;
    Ok(dest_path)
}
