import os
import subprocess
from lxml import etree

def resize_svg(svg_path, temp_svg_path, size):
    # Parse the SVG file
    tree = etree.parse(svg_path)
    root = tree.getroot()
    
    # Update width, height, and viewBox attributes
    root.set("width", str(size))
    root.set("height", str(size))
    
    if "viewBox" not in root.attrib:
        width = int(root.get("width", size))
        height = int(root.get("height", size))
        root.set("viewBox", f"0 0 {width} {height}")
    
    # Write the resized SVG to a temporary file
    tree.write(temp_svg_path)

def generate_png_assets_from_svg(svg_path, output_folder, sizes):
    os.makedirs(output_folder, exist_ok=True)

    temp_svg_path = "temp_resized.svg"
    for size in sizes:
        output_path = os.path.join(output_folder, f"{size}x{size}.png")
        
        # Resize the SVG
        resize_svg(svg_path, temp_svg_path, size)
        
        # Convert the resized SVG to PNG using rsvg-convert
        subprocess.run([
            "rsvg-convert",
            "-w", str(size),
            "-h", str(size),
            "-o", output_path,
            temp_svg_path
        ])
        print(f"Generated: {output_path}")

    # Remove the temporary SVG file
    os.remove(temp_svg_path)

# Path to your SVG file
svg_path = "YouTube.svg"  # Replace with the path to your SVG file

# Output folder for PNG assets
output_folder = "./"

# Sizes to generate
sizes = [16, 24, 32, 48, 64, 96, 128, 256, 512, 1024]

# Generate PNG assets
generate_png_assets_from_svg(svg_path, output_folder, sizes)
