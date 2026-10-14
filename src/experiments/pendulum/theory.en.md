## The model

A **simple (mathematical) pendulum** is a point mass $m$ on a light, inextensible string of length $L$. The bob moves along an arc; its position is given by the angle $\theta$ from the vertical.

Along the arc only the tangential component of gravity acts:

$$F_\tau = -mg\sin\theta.$$

Newton's second law for the arc coordinate $s = L\theta$ gives the equation of motion:

$$\ddot\theta = -\frac{g}{L}\sin\theta.$$

The mass cancels out, so the motion does not depend on $m$.

## Small oscillations

For small angles $\sin\theta \approx \theta$ (in radians). The equation becomes the harmonic oscillator equation, and the period is

$$T_0 = 2\pi\sqrt{\frac{L}{g}}.$$

This formula is accurate to better than 0.5% for amplitudes up to about 15°.

## Large amplitudes

The exact period of an undamped pendulum released from rest at $\theta_0$ is

$$T = 4\sqrt{\frac{L}{g}}\,K\!\left(\sin\frac{\theta_0}{2}\right),$$

where $K$ is the complete elliptic integral of the first kind. For moderate angles

$$\frac{T}{T_0} \approx 1 + \frac{\theta_0^2}{16} + \frac{11\,\theta_0^4}{3072}.$$

At 10° the difference is 0.2%, at 50° it is 5%, at 90° it is 18%. The simulation solves the full equation, so you can see this effect.

## Energy

Taking the lowest point as zero:

$$E_k = \frac{mv^2}{2}, \qquad E_p = mgL(1-\cos\theta), \qquad E = E_k + E_p = \text{const}.$$

Without damping the energy is conserved; the bars on the scene show it flowing between kinetic and potential.

## Damping

Air resistance at low speeds is modelled by a force proportional to the velocity:

$$\ddot\theta = -\frac{g}{L}\sin\theta - \gamma\dot\theta.$$

The amplitude then decays roughly as $e^{-\gamma t/2}$, and the energy decreases.

## How the lab works

Squaring the small-angle formula gives a linear dependence:

$$T^2 = \frac{4\pi^2}{g}\,L.$$

Plot $T^2$ against $L$, fit a straight line $T^2 = kL + b$ by least squares, and get $g = 4\pi^2/k$. The uncertainty of $g$ follows from the uncertainty of the slope.

Measure the time of $N = 10$ or more oscillations instead of one: the stopwatch reaction error (about 0.1–0.2 s) is then divided by $N$.

## Assumptions of the model

- The bob is a point mass; the string is massless and does not stretch.
- The pivot has no friction; air resistance is linear in velocity.
- The simulation integrates the equation with a fixed step of 1 ms (velocity Verlet method); the energy error stays below 0.01%.
