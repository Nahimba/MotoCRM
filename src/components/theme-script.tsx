// components/theme-script.tsx
export function ThemeScript() {
    const code = `(function() {
      try {
        const saved = localStorage.getItem('app-livery');
        const customColor = localStorage.getItem('app-custom-color');
        
        const themes = {
          red:    { p: 'oklch(0.6 0.2 25)', b: 'oklch(0.10 0.01 20)' },
          orange: { p: 'oklch(0.7 0.2 45)', b: 'oklch(0.12 0.01 285)' },
          yellow: { p: 'oklch(0.85 0.189 113.42)', b: 'oklch(0.10 0.01 20)' },
          green:  { p: 'oklch(0.8 0.25 145)', b: 'oklch(0.10 0.02 150)' },
          blue:   { p: 'oklch(0.6 0.2 250)', b: 'oklch(0.12 0.01 240)' }
        };
  
        if (saved === 'custom' && customColor) {
          document.documentElement.style.setProperty('--primary', customColor);
        } else if (themes[saved]) {
          document.documentElement.style.setProperty('--primary', themes[saved].p);
          document.documentElement.style.setProperty('--background', themes[saved].b);
        }
      } catch (e) {}
    })()`;
  
    return <script dangerouslySetInnerHTML={{ __html: code }} />;
  }