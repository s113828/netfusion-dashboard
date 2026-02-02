
$sourceDir = "C:\Users\x1138\.gemini\antigravity\brain\bf434f5b-dd08-4b73-8315-dcb01e373777"
$destDir = "c:\Users\x1138\OneDrive\Desktop\test1\mkt-dashboard\images"

Write-Host "Copying assets..."

Copy-Item -Path "$sourceDir\netfusion_hero_abstract_tech_1769973469138.png" -Destination "$destDir\hero-dashboard.png" -Force
Copy-Item -Path "$sourceDir\netfusion_analytics_dashboard_3d_1769973495967.png" -Destination "$destDir\analytics.png" -Force
Copy-Item -Path "$sourceDir\netfusion_feature_network_icon_1769973509627.png" -Destination "$destDir\ai-insights.png" -Force

Write-Host "Done."
