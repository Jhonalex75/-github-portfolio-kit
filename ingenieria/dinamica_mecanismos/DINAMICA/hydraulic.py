# Create a clear hydraulic schematic diagram (visual) representing a Rexroth "Hydraulic Flywheel (HFW)" system
# The diagram will be visible to the user.
import matplotlib.pyplot as plt
import matplotlib.patches as patches

fig, ax = plt.subplots(figsize=(14,10))  # Increased size for better spacing
ax.set_xlim(0,12); ax.set_ylim(0,8)
ax.axis('off')

# Draw pump/motor (variable displacement unit) - center-left
ax.add_patch(patches.Circle((2.0,5.5),0.35, fill=False, linewidth=1.5))
ax.text(2.0,5.5,"Pump/\nMotor\n(VG)", ha='center', va='center', fontsize=10)

# Flywheel accumulator (hydraulic flywheel) - right top
ax.add_patch(patches.Rectangle((8.0,6.0),1.5,1.8, fill=False, linewidth=1.5))
ax.text(8.75,6.9,"Hydraulic\nFlywheel\n(HFW)", ha='center', va='center', fontsize=10)

# Mechanical flywheel box (mechanical coupling)
ax.add_patch(patches.Rectangle((7.5,4.0),2.0,1.0, fill=False, linewidth=1.5))
ax.text(8.5,4.5,"Mechanical\nFlywheel\n(shaft)", ha='center', va='center', fontsize=10)

# Charge pump and tank bottom-left
ax.add_patch(patches.Circle((1.5,2.0),0.3, fill=False, linewidth=1.5))
ax.text(1.5,2.0,"Charge\nPump", ha='center', va='center', fontsize=10)
ax.add_patch(patches.Rectangle((0.5,0.5),2.0,0.8, fill=False, linewidth=1.5))
ax.text(1.5,0.9,"Tank", ha='center', va='center', fontsize=10)

# Motor/load box bottom-right
ax.add_patch(patches.Rectangle((8.5,1.0),2.0,1.0, fill=False, linewidth=1.5))
ax.text(9.5,1.5,"Drive\nLoad", ha='center', va='center', fontsize=10)

# Lines: high-pressure and low-pressure loop
# From pump to flywheel HFW (HP line)
ax.plot([2.35,4.0,6.0,8.0],[5.5,6.0,6.2,6.2], color='blue', linewidth=1.5, label='High Pressure Line')  # to HFW top
ax.plot([7.5,7.5],[5.5,6.2], color='blue', linewidth=1.5)  # connection to mechanical flywheel
# From HFW back to pump (LP line)
ax.plot([8.0,6.0,4.0,2.35],[5.0,4.8,4.6,4.6], color='green', linewidth=1.5, label='Low Pressure Line')

# Charge pump loop to tank and check valves
ax.plot([1.75,1.75,2.0],[2.0,3.5,4.6], color='gray', linestyle=':', linewidth=1.2)
ax.plot([2.0,2.0],[4.6,5.0], color='gray', linestyle=':', linewidth=1.2)

# Pressure relief valve near HP
ax.add_patch(patches.Rectangle((5.0,6.3),0.8,0.5, fill=False, linewidth=1.5))
ax.text(5.4,6.55,"Relief\nvalve", ha='center', va='center', fontsize=9)

# Check valves and control valves drawn as triangles
ax.add_patch(patches.RegularPolygon((4.6,5.1),3,radius=0.15,orientation=0, fill=False, linewidth=1.5))
ax.text(4.6,4.9,"CV", ha='center', va='center', fontsize=9)  # control/check valve symbol label

# Arrow showing flow direction on HP line
ax.annotate('', xy=(7.0,6.2), xytext=(4.0,6.0), arrowprops=dict(arrowstyle='->', lw=1.5, color='blue'))

# Labels for lines
ax.text(6.0,6.5,"High pressure line (P)", fontsize=10, color='blue')
ax.text(6.0,4.5,"Low pressure line (T)", fontsize=10, color='green')

# Mechanical coupling arrow between HFW and mechanical flywheel
ax.annotate('', xy=(8.0,5.5), xytext=(7.5,4.5), arrowprops=dict(arrowstyle='<->', lw=1.5, color='black'))
ax.text(8.3,5.0,"Hydraulic-mech\ncoupling", ha='left', va='center', fontsize=9)

# Annotations explaining components
ax.text(0.5,7.5,"Schematic: Hydraulic Flywheel (HFW) system (Rexroth)", fontsize=14, weight='bold')
ax.text(0.5,7.0,"Key: Variable pump/motor (VG), Hydraulic flywheel accumulator, Charge pump, Relief valve, Mechanical flywheel", fontsize=10)
ax.text(0.5,6.5,"Function: Store kinetic energy hydraulically + mechanically; recuperate during peak demand", fontsize=10)

# Save figure
plt.legend(loc='lower left', fontsize=9)
plt.show()

# Save to file for user download
fig.savefig('hydraulic_flywheel_schematic_updated.png', dpi=300, bbox_inches='tight')
print("Saved schematic to: hydraulic_flywheel_schematic_updated.png")
