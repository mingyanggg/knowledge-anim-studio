#!/usr/bin/env python3
"""
Enhanced Manim YAML Renderer

Supports:
- LaTeX math formulas with MathTex()
- Relative positioning with next_to
- Physics objects (charges, fields, magnets, springs)
- Chemistry objects (molecules, orbitals)
- Coordinate axes and function graphs
- Decorative elements (braces, arrows, backgrounds)
- Advanced animations (transform, lagged)
"""

import sys
import os
import yaml
import logging
import tempfile
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional, List

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


class EnhancedYamlRenderer:
    """Enhanced YAML to Manim renderer with physics/chemistry support."""

    def __init__(self, output_dir: str = None):
        """Initialize the renderer."""
        self.output_dir = Path(output_dir) if output_dir else Path("/Users/michael/.knowledge-anim-output")
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.has_physics = False
        self.has_chemistry = False

        # Try to import optional physics/chemistry libraries
        try:
            import manim_physics
            self.has_physics = True
            logger.info("manim_physics loaded successfully")
        except ImportError:
            logger.warning("manim_physics not available, physics objects will use fallback")

        try:
            import manim_chemistry
            self.has_chemistry = True
            logger.info("manim_chemistry loaded successfully")
        except ImportError:
            logger.warning("manim_chemistry not available, chemistry objects will use fallback")

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
        if not has_content:
            script_lines = [
                "from manim import *",
                "",
                f"class {scene_name}(Scene):",
                f"    def construct(self):",
                f"        pass",
            ]
            return "\n".join(script_lines)

        # Import statements
        script_lines = [
            "from manim import *",
        ]

        if self.has_physics:
            script_lines.append("from manim_physics import *")

        if self.has_chemistry:
            script_lines.append("from manim_chemistry import *")

        script_lines.append("")
        script_lines.append(f"class {scene_name}(Scene):")
        script_lines.append(f"    def construct(self):")
        script_lines.append("")

        # Build objects
        obj_vars = {}
        axes_objects = {}  # Track axes for graph references

        for obj in objects:
            obj_name = obj.get('name', f'obj_{len(obj_vars)}')
            obj_type = obj.get('type', 'text')
            params = obj.get('params', {})
            position = obj.get('position')
            next_to = obj.get('next_to')

            var_name = f"{obj_name}_obj"
            obj_vars[obj_name] = var_name

            # Generate object creation code
            obj_code = self._create_object(obj_type, params, var_name, obj_name)
            script_lines.append(obj_code)
            script_lines.append("")

            # Handle positioning
            if next_to:
                # Relative positioning
                target = next_to.get('target')
                direction = next_to.get('direction', 'RIGHT')
                buff = next_to.get('buff', 0.5)

                if target and target in obj_vars:
                    target_var = obj_vars[target]
                    script_lines.append(f"        {var_name}.next_to({target_var}, {direction}, buff={buff})")
                elif not target:  # Center positioning
                    script_lines.append(f"        {var_name}.move_to(ORIGIN)")
            elif position is not None:
                # Absolute positioning
                script_lines.append(f"        {var_name}.move_to({position})")

            # Add to scene for non-background objects
            if obj_type != 'background':
                script_lines.append(f"        self.add({var_name})")

            # Track axes for graph references
            if obj_type == 'axes':
                axes_objects[obj_name] = var_name

            script_lines.append("")

        # Add animations
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

            # Handle special targets
            if target == 'all_objects':
                all_var_names = list(obj_vars.values())
                if all_var_names:
                    args = ", ".join(all_var_names)
                    if anim_type in ['fadeout', 'fade_out']:
                        script_lines.append(f"        self.play(FadeOut({args}), run_time={anim_duration})")
                    elif anim_type in ['fadein', 'fade_in']:
                        script_lines.append(f"        self.play(FadeIn({args}), run_time={anim_duration})")
                elapsed_time += anim_duration
                continue

            var_name = obj_vars.get(target)
            if not var_name:
                elapsed_time += anim_duration
                continue

            # Generate animation code
            anim_code = self._create_animation(anim_type, var_name, anim_duration, params)
            script_lines.append(anim_code)

            elapsed_time += anim_duration

        # Final wait
        if animations and elapsed_time < duration:
            script_lines.append(f"        self.wait({duration - elapsed_time})")

        script_lines.append("")
        return "\n".join(script_lines)

    def _create_object(self, obj_type: str, params: Dict, var_name: str, obj_name: str) -> str:
        """Generate Python code for creating an object."""
        if obj_type == 'text':
            return self._create_text(params, var_name)

        elif obj_type == 'latex':
            return self._create_latex(params, var_name)

        elif obj_type == 'formula':
            return self._create_formula(params, var_name)

        elif obj_type == 'shape':
            return self._create_shape(params, var_name)

        elif obj_type == 'axes':
            return self._create_axes(params, var_name)

        elif obj_type == 'graph':
            return self._create_graph(params, var_name)

        elif obj_type == 'number_line':
            return self._create_number_line(params, var_name)

        elif obj_type == 'physics_charge':
            return self._create_physics_charge(params, var_name)

        elif obj_type == 'physics_field':
            return self._create_physics_field(params, var_name)

        elif obj_type == 'physics_bar_magnet':
            return self._create_physics_bar_magnet(params, var_name)

        elif obj_type == 'physics_spring':
            return self._create_physics_spring(params, var_name)

        elif obj_type == 'chemistry_molecule':
            return self._create_chemistry_molecule(params, var_name)

        elif obj_type == 'chemistry_orbital':
            return self._create_chemistry_orbital(params, var_name)

        elif obj_type == 'background':
            return self._create_background(params, var_name)

        elif obj_type == 'braces':
            return self._create_braces(params, var_name)

        elif obj_type == 'arrow_between':
            return self._create_arrow_between(params, var_name)

        else:
            # Fallback for unknown types
            return f"        {var_name} = Text('{obj_type}')"

    def _create_text(self, params: Dict, var_name: str) -> str:
        """Create a text object."""
        text = params.get('text', 'Text')
        font_size = params.get('font_size', 48)
        color = params.get('color', '#FFFFFF')
        gradient = params.get('gradient')

        # Sanitize font size
        if font_size > 72:
            font_size = 72
        elif font_size < 24:
            font_size = 24

        if gradient:
            grad_str = str(gradient).replace("'", '"')
            return f"        {var_name} = Text({repr(text)}, gradient={grad_str}, font_size={font_size})"
        else:
            return f"        {var_name} = Text({repr(text)}, color='{color}', font_size={font_size})"

    def _create_latex(self, params: Dict, var_name: str) -> str:
        """Create a LaTeX formula object using MathTex."""
        text = params.get('text', 'x')
        font_size = params.get('font_size', 48)
        color = params.get('color', '#FFFFFF')

        # Sanitize font size
        if font_size > 72:
            font_size = 72
        elif font_size < 32:
            font_size = 32

        return f"        {var_name} = MathTex({repr(text)}, color='{color}', font_size={font_size})"

    def _create_formula(self, params: Dict, var_name: str) -> str:
        """Create a formula with decorative box."""
        text = params.get('text', 'E = mc^2')
        font_size = params.get('font_size', 48)
        color = params.get('color', '#FFFFFF')
        box_color = params.get('box_color', '#FFD700')
        box_opacity = params.get('box_opacity', 0.3)

        # Create formula and background rectangle
        return f"""        {var_name}_formula = MathTex({repr(text)}, color='{color}', font_size={font_size})
        {var_name}_bg = BackgroundRectangle({var_name}_formula, color='{box_color}', fill_opacity={box_opacity})
        {var_name} = VGroup({var_name}_bg, {var_name}_formula)"""

    def _create_shape(self, params: Dict, var_name: str) -> str:
        """Create geometric shapes."""
        shape_type = params.get('shape_type', 'circle')
        color = params.get('color', '#FFFFFF')
        fill_opacity = params.get('fill_opacity', 0)

        if shape_type == 'circle':
            radius = params.get('radius', 1)
            return f"        {var_name} = Circle(radius={radius}, color='{color}', fill_opacity={fill_opacity})"

        elif shape_type == 'square':
            side_length = params.get('side_length', 1)
            return f"        {var_name} = Square(side_length={side_length}, color='{color}', fill_opacity={fill_opacity})"

        elif shape_type == 'rectangle':
            side_length = params.get('side_length', [2, 1])
            if isinstance(side_length, list) and len(side_length) >= 2:
                width, height = side_length[0], side_length[1]
            else:
                width, height = 2, 1
            return f"        {var_name} = Rectangle(width={width}, height={height}, color='{color}', fill_opacity={fill_opacity})"

        elif shape_type == 'polygon':
            vertices = params.get('vertices')
            if vertices and len(vertices) > 0:
                vert_args = ", ".join(str(v) for v in vertices)
                return f"        {var_name} = Polygon({vert_args}, color='{color}', fill_opacity={fill_opacity})"
            else:
                return f"        {var_name} = Polygon([-1, -0.3, 0], [1, 0, 0], [-1, 0.3, 0], color='{color}', fill_opacity={fill_opacity})"

        elif shape_type == 'arrow':
            tip = params.get('tip', 0.3)
            max_tip_length_to_tip = params.get('max_tip_length_to_tip', 0.35)
            max_stroke_width = params.get('max_stroke_width', 5)
            return f"        {var_name} = Arrow(color='{color}', tip_length={tip}, max_tip_length_to_tip={max_tip_length_to_tip}, max_stroke_width={max_stroke_width})"

        else:
            return f"        {var_name} = Circle(color='{color}', fill_opacity={fill_opacity})"

    def _create_axes(self, params: Dict, var_name: str) -> str:
        """Create coordinate axes."""
        x_range = params.get('x_range', [-5, 5])
        y_range = params.get('y_range', [-3, 3])
        color = params.get('color', '#FFFFFF')

        return f"        {var_name} = Axes(x_range={x_range}, y_range={y_range}, color='{color}')"

    def _create_graph(self, params: Dict, var_name: str) -> str:
        """Create function graph on axes."""
        function = params.get('function', 'x**2')
        x_range = params.get('x_range', [-5, 5])
        color = params.get('color', '#FFD700')
        axes_ref = params.get('axes_ref', 'axes')

        # This will need to be fixed up later to reference the actual axes variable
        return f"        {var_name} = {axes_ref}_obj.plot(lambda x: {function}, x_range={x_range}, color='{color}')"

    def _create_number_line(self, params: Dict, var_name: str) -> str:
        """Create number line."""
        x_range = params.get('x_range', [-5, 5])
        color = params.get('color', '#FFFFFF')
        label_direction = params.get('label_direction', 'DOWN')

        return f"        {var_name} = NumberLine(x_range={x_range}, color='{color}', label_direction={label_direction})"

    def _create_physics_charge(self, params: Dict, var_name: str) -> str:
        """Create electric charge."""
        charge = params.get('charge', 1)
        radius = params.get('radius', 0.5)
        color = params.get('color', '#FF4757' if charge > 0 else '#3742FA')

        if self.has_physics:
            return f"        {var_name} = Charge({charge}, color='{color}')"
        else:
            # Fallback: use Circle with label
            sign = '+' if charge > 0 else '-' if charge < 0 else '0'
            return f"""        {var_name}_circle = Circle(radius={radius}, color='{color}', fill_opacity=0.8)
        {var_name}_label = MathTex('{sign}', color='WHITE').scale(2)
        {var_name}_label.move_to({var_name}_circle)
        {var_name} = VGroup({var_name}_circle, {var_name}_label)"""

    def _create_physics_field(self, params: Dict, var_name: str) -> str:
        """Create electric/magnetic field."""
        field_type = params.get('field_type', 'electric')
        charges_ref = params.get('charges_ref', [])

        if self.has_physics and charges_ref:
            # Convert charge names to variable references
            charge_vars = ", ".join([f"{c}_obj" for c in charges_ref])
            if field_type == 'electric':
                return f"        {var_name} = ElectricField({charge_vars})"
            elif field_type == 'magnetic':
                return f"        {var_name} = MagneticField({charge_vars})"
            else:
                return f"        {var_name} = VGroup()"
        else:
            # Fallback
            return f"        {var_name} = VGroup()"

    def _create_physics_bar_magnet(self, params: Dict, var_name: str) -> str:
        """Create bar magnet."""
        color = params.get('color', '#FF6B6B')
        strength = params.get('strength', 1)

        if self.has_physics:
            return f"        {var_name} = BarMagnet(strength={strength}, color='{color}')"
        else:
            # Fallback: create a simple rectangle with N/S labels
            return f"""        {var_name}_rect = Rectangle(width=3, height=1, color='{color}', fill_opacity=0.8)
        {var_name}_north = Text('N', color='WHITE').move_to({var_name}_rect.get_left())
        {var_name}_south = Text('S', color='WHITE').move_to({var_name}_rect.get_right())
        {var_name} = VGroup({var_name}_rect, {var_name}_north, {var_name}_south)"""

    def _create_physics_spring(self, params: Dict, var_name: str) -> str:
        """Create spring visualization."""
        start_point = params.get('start_point', [-2, 0, 0])
        end_point = params.get('end_point', [2, 0, 0])
        coils = params.get('coils', 10)
        radius = params.get('radius', 0.3)

        if self.has_physics:
            return f"        {var_name} = Spring({start_point}, {end_point}, coils={coils}, radius={radius})"
        else:
            # Fallback: use a simple Line
            return f"        {var_name} = Line({start_point}, {end_point})"

    def _create_chemistry_molecule(self, params: Dict, var_name: str) -> str:
        """Create molecule from SMILES."""
        smiles = params.get('smiles', 'O')
        size = params.get('size', 2)

        if self.has_chemistry:
            return f"        {var_name} = Molecule.from_smiles('{smiles}').scale({size})"
        else:
            # Fallback: use text label
            return f"        {var_name} = Text('Molecule: {smiles}', font_size=36).scale({size})"

    def _create_chemistry_orbital(self, params: Dict, var_name: str) -> str:
        """Create atomic orbital."""
        orbital_type = params.get('orbital_type', 's')
        principal_n = params.get('principal_n', 1)
        size = params.get('size', 2)

        if self.has_chemistry:
            return f"        {var_name} = Orbital('{orbital_type}', n={principal_n}).scale({size})"
        else:
            # Fallback: use circle with label
            label = f"{principal_n}{orbital_type}"
            return f"""        {var_name}_circle = Circle(radius={size}, color='#00D9FF', fill_opacity=0.3)
        {var_name}_label = Text('{label}', color='WHITE').scale(0.8)
        {var_name}_label.move_to({var_name}_circle)
        {var_name} = VGroup({var_name}_circle, {var_name}_label)"""

    def _create_background(self, params: Dict, var_name: str) -> str:
        """Create decorative background."""
        gradient_colors = params.get('gradient_colors', ['#000000', '#1a1a2e'])
        opacity = params.get('opacity', 0.8)
        bg_color = gradient_colors[0] if gradient_colors else '#000000'
        return f"        {var_name} = FullScreenRectangle(fill_color='{bg_color}', fill_opacity={opacity}).set_z_index(-1)"

    def _create_braces(self, params: Dict, var_name: str) -> str:
        """Create braces annotation."""
        target_ref = params.get('target_ref', '')
        label = params.get('label', '')
        direction = params.get('direction', 'DOWN')

        return f"""        {var_name}_brace = Brace({target_ref}_obj, {direction})
        {var_name}_label = {var_name}_brace.get_text('{label}')
        {var_name} = VGroup({var_name}_brace, {var_name}_label)"""

    def _create_arrow_between(self, params: Dict, var_name: str) -> str:
        """Create arrow between two objects."""
        from_ref = params.get('from_ref', '')
        to_ref = params.get('to_ref', '')
        color = params.get('color', '#FFFFFF')
        tip_length = params.get('tip_length', 0.3)

        return f"        {var_name} = Arrow({from_ref}_obj.get_center(), {to_ref}_obj.get_center(), color='{color}', tip_length={tip_length}, buff=0.1)"

    def _create_animation(self, anim_type: str, var_name: str, duration: float, params: Dict) -> str:
        """Generate animation code."""
        run_time = params.get('run_time', duration)
        lag_ratio = params.get('lag_ratio', None)
        rate_func = params.get('rate_func', None)

        # Build animation kwargs
        kwargs = [f"run_time={run_time}"]
        if lag_ratio is not None:
            kwargs.append(f"lag_ratio={lag_ratio}")
        if rate_func:
            kwargs.append(f"rate_func={rate_func}")

        kwargs_str = ", ".join(kwargs)

        if anim_type == 'write':
            return f"        self.play(Write({var_name}), {kwargs_str})"

        elif anim_type == 'create':
            return f"        self.play(Create({var_name}), {kwargs_str})"

        elif anim_type in ['fadein', 'fade_in']:
            return f"        self.play(FadeIn({var_name}), {kwargs_str})"

        elif anim_type in ['fadeout', 'fade_out']:
            return f"        self.play(FadeOut({var_name}), {kwargs_str})"

        elif anim_type == 'move':
            to_pos = params.get('to', [0, 0])
            return f"        self.play({var_name}.animate.move_to({to_pos}), run_time={run_time})"

        elif anim_type == 'scale':
            factor = params.get('factor', 1.5)
            return f"        self.play({var_name}.animate.scale({factor}), run_time={run_time})"

        elif anim_type == 'rotate':
            angle = params.get('angle', 360)
            return f"        self.play(Rotate({var_name}, angle={angle}*DEGREES), run_time={run_time})"

        elif anim_type == 'transform':
            to_obj = params.get('to_object', '')
            if to_obj:
                return f"        self.play(Transform({var_name}, {to_obj}_obj), run_time={run_time})"
            else:
                return f"        self.play({var_name}.animate.scale(0.5), run_time={run_time})"

        elif anim_type == 'lagged':
            return f"        self.play(LaggedStart(*{var_name}, lag_ratio={lag_ratio or 0.5}), run_time={run_time})"

        else:
            return f"        self.play(Write({var_name}), run_time={run_time})"

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

                # If a specific output path was requested, copy the file there
                final_path = mp4_path
                if output_path:
                    target = Path(output_path)
                    target.parent.mkdir(parents=True, exist_ok=True)
                    import shutil
                    shutil.copy2(str(mp4_path), str(target))
                    final_path = target
                    logger.info(f"Copied output to: {target}")

                duration = time.time() - start_time
                logger.info(f"Render completed successfully in {duration:.2f}s")

                return {
                    "success": True,
                    "output_path": str(final_path),
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
    renderer = EnhancedYamlRenderer()
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
