#!/usr/bin/env python3
"""
Simplified Manim YAML Renderer

This module provides a simple interface to render animations from YAML configuration.
It's designed to be called from the Rust backend and uses Manim directly.
"""

import sys
import os
import yaml
import logging
import tempfile
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class RenderError(Exception):
    """Base exception for render errors."""
    pass


class ValidationError(RenderError):
    """Exception raised for YAML validation errors."""
    pass


class SimpleYamlRenderer:
    """Simple YAML to Manim renderer."""

    def __init__(self, output_dir: str = None):
        """Initialize the renderer."""
        self.output_dir = Path(output_dir) if output_dir else Path("/Users/michael/.knowledge-anim-output")
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def validate_yaml(self, yaml_content: str) -> Dict[str, Any]:
        """Validate and parse YAML content."""
        try:
            data = yaml.safe_load(yaml_content)
        except yaml.YAMLError as e:
            raise ValidationError(f"YAML parsing error: {e}")

        if not isinstance(data, dict):
            raise ValidationError("YAML root must be a dictionary/object")

        if 'scene' not in data:
            raise ValidationError("YAML must contain a 'scene' key")

        return data

    def yaml_to_python(self, yaml_data: Dict[str, Any]) -> str:
        """Convert YAML configuration to Manim Python script."""
        scene = yaml_data.get('scene', {})
        scene_name = scene.get('name', 'GeneratedScene')
        duration = scene.get('duration', 10)
        fps = scene.get('fps', 60)
        resolution = scene.get('resolution', [1920, 1080])
        bg_color = scene.get('background_color', '#000000')

        objects = yaml_data.get('objects', []) or scene.get('objects', [])
        animations = yaml_data.get('animations', []) or scene.get('animations', [])

        # Build Python script
        has_content = len(objects) > 0 or len(animations) > 0
        if has_content:
            script_lines = [
                "from manim import *",
                "",
                f"class {scene_name}(Scene):",
                f"    def construct(self):",
            ]
        else:
            script_lines = [
                "from manim import *",
                "",
                f"class {scene_name}(Scene):",
                f"    def construct(self):",
                f"        pass",
            ]
            return "\n".join(script_lines)

        # Add objects with text overlap prevention
        obj_vars = {}
        last_text_y = None
        min_vertical_spacing = 0.8
        for obj in objects:
            obj_name = obj.get('name', f'obj_{len(obj_vars)}')
            obj_type = obj.get('type', 'text')
            params = obj.get('params', {})
            position = obj.get('position', [0, 0, 0])

            var_name = f"{obj_name}_obj"
            obj_vars[obj_name] = var_name

            if obj_type == 'text':
                text = params.get('text', 'Text')
                font_size = params.get('font_size', 48)
                color = params.get('color', '#FFFFFF')
                gradient = params.get('gradient')

                # Cap font sizes at reasonable max values
                if font_size > 56:
                    font_size = 56
                elif font_size > 36 and font_size < 48:
                    font_size = 36
                elif font_size < 28:
                    font_size = 28

                # Prevent text overlap by adjusting vertical position
                if len(position) >= 2:
                    current_y = position[1]
                    if last_text_y is not None and abs(current_y - last_text_y) < min_vertical_spacing:
                        # Shift down to maintain minimum spacing
                        position = list(position)
                        position[1] = last_text_y - min_vertical_spacing
                        last_text_y = position[1]
                    else:
                        last_text_y = current_y

                if gradient:
                    gradient_str = str(gradient).replace("'", '"')
                    script_lines.append(f"        {var_name} = Text({repr(text)}, gradient={gradient_str}, font_size={font_size})")
                else:
                    script_lines.append(f"        {var_name} = Text({repr(text)}, color='{color}', font_size={font_size})")

            elif obj_type == 'shape':
                shape_type = params.get('shape_type', 'circle')
                color = params.get('color', '#FFFFFF')
                fill_opacity = params.get('fill_opacity', 0)

                if shape_type == 'circle':
                    radius = params.get('radius', 1)
                    script_lines.append(f"        {var_name} = Circle(radius={radius}, color='{color}', fill_opacity={fill_opacity})")
                elif shape_type == 'square':
                    side_length = params.get('side_length', 1)
                    script_lines.append(f"        {var_name} = Square(side_length={side_length}, color='{color}', fill_opacity={fill_opacity})")
                elif shape_type == 'rectangle':
                    side_length = params.get('side_length', [2, 1])
                    if isinstance(side_length, list) and len(side_length) >= 2:
                        width, height = side_length[0], side_length[1]
                    else:
                        width, height = 2, 1
                    script_lines.append(f"        {var_name} = Rectangle(width={width}, height={height}, color='{color}', fill_opacity={fill_opacity})")
                elif shape_type == 'polygon':
                    # Polygon — vertices need to be unpacked args
                    vertices = params.get('vertices')
                    if vertices and len(vertices) > 0:
                        # Generate unpacked vertex arguments
                        vert_args = ", ".join(str(v) for v in vertices)
                        script_lines.append(f"        {var_name} = Polygon({vert_args}, color='{color}', fill_opacity={fill_opacity})")
                    else:
                        # Default triangle arrow shape
                        script_lines.append(f"        {var_name} = Polygon([-1, -0.3, 0], [1, 0, 0], [-1, 0.3, 0], color='{color}', fill_opacity={fill_opacity})")
                elif shape_type == 'arrow':
                    tip = params.get('tip', 0.3)
                    max_tip_length_to_tip = params.get('max_tip_length_to_tip', 0.35)
                    max_stroke_width = params.get('max_stroke_width', 5)
                    script_lines.append(f"        {var_name} = Arrow(color='{color}', tip_length={tip}, max_tip_length_to_tip={max_tip_length_to_tip}, max_stroke_width={max_stroke_width})")
                else:
                    script_lines.append(f"        {var_name} = Circle(color='{color}', fill_opacity={fill_opacity})")

            elif obj_type == 'group':
                # Group type — just create a VGroup placeholder, children will be separate objects
                script_lines.append(f"        {var_name} = VGroup()")
                # Don't position or add to scene yet — children are added separately

            # Position and add (skip for groups — children handle themselves)
            if obj_type != 'group':
                script_lines.append(f"        {var_name}.move_to({position})")
                script_lines.append(f"        self.add({var_name})")
            script_lines.append("")

        # Add animations — track elapsed time to avoid redundant waits
        elapsed_time = 0.0
        for anim in animations:
            target = anim.get('target')
            anim_type = anim.get('type', 'write')
            start_time = anim.get('start_time', 0)
            anim_duration = anim.get('duration', 1)
            params = anim.get('params', {})

            # Wait until this animation's start_time
            wait_needed = start_time - elapsed_time
            if wait_needed > 0:
                script_lines.append(f"        self.wait({wait_needed})")
                elapsed_time = start_time

            # Handle all_objects target — fadeout everything
            if target == 'all_objects':
                all_var_names = list(obj_vars.values())
                if all_var_names:
                    if anim_type == 'fadeout' or anim_type == 'fade_out':
                        args = ", ".join(all_var_names)
                        script_lines.append(f"        self.play(FadeOut({args}), run_time={anim_duration})")
                    elif anim_type == 'fadein' or anim_type == 'fade_in':
                        args = ", ".join(all_var_names)
                        script_lines.append(f"        self.play(FadeIn({args}), run_time={anim_duration})")
                elapsed_time += anim_duration
                continue

            var_name = obj_vars.get(target)
            if not var_name:
                elapsed_time += anim_duration
                continue

            if anim_type == 'write':
                script_lines.append(f"        self.play(Write({var_name}), run_time={anim_duration})")
            elif anim_type == 'create':
                script_lines.append(f"        self.play(Create({var_name}), run_time={anim_duration})")
            elif anim_type == 'fadein' or anim_type == 'fade_in':
                script_lines.append(f"        self.play(FadeIn({var_name}), run_time={anim_duration})")
            elif anim_type == 'fadeout' or anim_type == 'fade_out':
                script_lines.append(f"        self.play(FadeOut({var_name}), run_time={anim_duration})")
            elif anim_type == 'move':
                to_pos = params.get('to', [0, 0])
                script_lines.append(f"        self.play({var_name}.animate.move_to({to_pos}), run_time={anim_duration})")
            elif anim_type == 'scale':
                factor = params.get('factor', 1.5)
                script_lines.append(f"        self.play({var_name}.animate.scale({factor}), run_time={anim_duration})")
            elif anim_type == 'rotate':
                angle = params.get('angle', 360)
                script_lines.append(f"        self.play(Rotate({var_name}, angle={angle}*DEGREES), run_time={anim_duration})")

            elapsed_time += anim_duration

        # Final wait if needed
        if animations:
            if elapsed_time < duration:
                script_lines.append(f"        self.wait({duration - elapsed_time})")

        script_lines.append("")
        return "\n".join(script_lines)

    def render_from_yaml(
        self,
        yaml_content: str,
        output_path: str = None,
        quality: str = "l"
    ) -> Dict[str, Any]:
        """Render animation from YAML configuration."""
        import time
        import json
        start_time = time.time()

        try:
            # Validate YAML
            logger.info("Validating YAML configuration...")
            data = self.validate_yaml(yaml_content)

            # Convert to Python script
            logger.info("Converting YAML to Manim script...")
            script = self.yaml_to_python(data)

            # Write script to temp file
            scene = data.get('scene', {})
            scene_name = scene.get('name', 'GeneratedScene')

            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, prefix='temp_scene_', dir=str(self.output_dir)) as f:
                f.write(script)
                script_path = f.name

            try:
                # Render using Manim
                logger.info(f"Rendering scene: {scene_name}")

                cmd = [
                    sys.executable, "-m", "manim", "render",
                    f"-q{quality}",
                    "--format", "mp4",
                    "--media_dir", str(self.output_dir),
                    script_path,
                    scene_name
                ]

                logger.info(f"Running: {' '.join(cmd)}")

                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=120
                )

                if result.returncode != 0:
                    logger.error(f"Manim render failed: {result.stderr}")
                    return {
                        "success": False,
                        "error": result.stderr,
                        "duration": time.time() - start_time
                    }

                # Find output file
                # Manim creates files in: media_dir/videos/tmpXXX/quality/scenename.mp4
                fps = scene.get('fps', 60)
                quality_map = {
                    'l': '480p15',
                    'm': '720p30',
                    'h': '1080p60',
                    'p': '1440p60',
                    'k': '2160p60'
                }
                quality_dir = quality_map.get(quality, '480p15')

                # Search for the output file
                mp4_path = None
                videos_dir = self.output_dir / "videos"

                if videos_dir.exists():
                    # Look for any subdirectory containing the scene file
                    for subdir in videos_dir.iterdir():
                        if subdir.is_dir():
                            # Check for scene file in quality subdirectory
                            quality_path = subdir / quality_dir / f"{scene_name}.mp4"
                            if quality_path.exists():
                                mp4_path = quality_path
                                break

                if not mp4_path:
                    # Try alternative path patterns
                    for pattern in [
                        videos_dir / scene_name / quality_dir / f"{scene_name}.mp4",
                        videos_dir / f"{scene_name}.mp4",
                        self.output_dir / f"{scene_name}.mp4"
                    ]:
                        if pattern.exists():
                            mp4_path = pattern
                            break

                if not mp4_path:
                    return {
                        "success": False,
                        "error": f"Output file not found. Searched in {videos_dir}",
                        "duration": time.time() - start_time
                    }

                duration = time.time() - start_time
                logger.info(f"Render completed successfully in {duration:.2f}s")

                return {
                    "success": True,
                    "output_path": str(mp4_path),
                    "duration": duration,
                    "scene_name": scene_name
                }

            finally:
                # Clean up temp script
                try:
                    os.unlink(script_path)
                except:
                    pass

        except Exception as e:
            logger.error(f"Render error: {e}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "error": str(e),
                "duration": time.time() - start_time
            }


def main():
    """CLI entry point for testing."""
    import argparse
    import json

    parser = argparse.ArgumentParser(
        description="Render YAML configuration to Manim animation"
    )
    parser.add_argument(
        "yaml_file",
        help="Path to YAML configuration file"
    )
    parser.add_argument(
        "-o", "--output",
        help="Output file path"
    )
    parser.add_argument(
        "-q", "--quality",
        choices=["l", "m", "h", "p", "k"],
        default="l",
        help="Render quality"
    )

    args = parser.parse_args()

    # Read YAML file
    with open(args.yaml_file, 'r') as f:
        yaml_content = f.read()

    # Create renderer and render
    renderer = SimpleYamlRenderer()
    result = renderer.render_from_yaml(
        yaml_content,
        output_path=args.output,
        quality=args.quality
    )

    # Output JSON result
    print(json.dumps(result, indent=2))

    return 0 if result['success'] else 1


if __name__ == "__main__":
    sys.exit(main())
