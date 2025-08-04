from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size):
    # Create a new image with a transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Define colors (Google Material Design inspired)
    primary_color = (66, 133, 244)  # Google Blue
    accent_color = (52, 168, 83)    # Google Green
    
    # Draw background circle
    margin = size // 8
    circle_coords = [margin, margin, size - margin, size - margin]
    draw.ellipse(circle_coords, fill=primary_color)
    
    # Draw inner elements (simplified AI/chat bubble icon)
    inner_margin = size // 4
    
    # Draw chat bubble
    bubble_coords = [inner_margin, inner_margin + size//16, 
                    size - inner_margin, size - inner_margin]
    draw.rounded_rectangle(bubble_coords, radius=size//16, fill='white')
    
    # Draw AI symbol (simplified neural network dots)
    dot_size = size // 20
    center_x, center_y = size // 2, size // 2
    
    # Three dots forming a triangle pattern
    positions = [
        (center_x, center_y - size//8),      # Top
        (center_x - size//10, center_y + size//16), # Bottom left
        (center_x + size//10, center_y + size//16)  # Bottom right
    ]
    
    for x, y in positions:
        dot_coords = [x - dot_size, y - dot_size, x + dot_size, y + dot_size]
        draw.ellipse(dot_coords, fill=accent_color)
    
    # Draw connecting lines
    line_width = max(1, size // 32)
    for i in range(len(positions)):
        for j in range(i + 1, len(positions)):
            draw.line([positions[i], positions[j]], fill=accent_color, width=line_width)
    
    return img

# Create icons in different sizes
sizes = [16, 48, 128]
for size in sizes:
    icon = create_icon(size)
    icon.save(f'icon{size}.png', 'PNG')
    print(f'Created icon{size}.png')

print('All icons created successfully!')
