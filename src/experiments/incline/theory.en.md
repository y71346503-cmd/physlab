## Forces on the block

Three forces act on a block on a slope of angle $\alpha$:

- gravity $m\vec g$, straight down;
- the normal force $\vec N$, perpendicular to the surface;
- friction $\vec F_{fr}$, along the surface, against the (possible) motion.

Split gravity into a component along the slope and one into it:

$$F_\parallel = mg\sin\alpha, \qquad F_\perp = mg\cos\alpha.$$

Perpendicular to the slope nothing moves, so $N = mg\cos\alpha$.

## Rest or sliding

Static friction can hold the block up to $F_{max} = \mu N = \mu mg\cos\alpha$. The block stays at rest while

$$mg\sin\alpha \le \mu mg\cos\alpha \iff \tan\alpha \le \mu.$$

At rest the friction force equals $mg\sin\alpha$, not $\mu N$.

## Sliding down

When $\tan\alpha > \mu$, kinetic friction $F_{fr} = \mu N$ acts and Newton's second law gives

$$ma = mg\sin\alpha - \mu mg\cos\alpha \quad\Rightarrow\quad a = g(\sin\alpha - \mu\cos\alpha).$$

The mass cancels. From rest the block covers $s = at^2/2$.

## How the lab works

Measure the time $t$ to the photogate at distance $s$, then $a = 2s/t^2$. Dividing the formula for $a$ by $\cos\alpha$ gives a straight line:

$$\frac{a}{\cos\alpha} = g\tan\alpha - \mu g.$$

Fit $a/\cos\alpha = k\tan\alpha + b$; then $g = k$ and $\mu = -b/k$.

## Assumptions of the model

- Static and kinetic friction coefficients are equal; in reality static friction is usually slightly larger.
- The block does not tip over or rotate; air resistance is ignored.
