## Motion without air resistance

A ball launched with speed $v_0$ at angle $\alpha$ to the horizontal moves under gravity alone. The horizontal and vertical motions are independent:

$$x = v_0\cos\alpha\; t, \qquad y = h_0 + v_0\sin\alpha\; t - \frac{g t^2}{2}.$$

Horizontally the velocity is constant; vertically the ball moves with acceleration $g$ downwards. The trajectory is a parabola.

## Range, height, flight time

For a launch from the ground ($h_0 = 0$):

$$T = \frac{2 v_0 \sin\alpha}{g}, \qquad H = \frac{v_0^2 \sin^2\alpha}{2g}, \qquad L = \frac{v_0^2 \sin 2\alpha}{g}.$$

The range is largest at $\alpha = 45^\circ$. Angles $\alpha$ and $90^\circ - \alpha$ give the same range.

From a height $h_0$ the flight time is the positive root of $y(T) = 0$:

$$T = \frac{v_0\sin\alpha + \sqrt{v_0^2\sin^2\alpha + 2gh_0}}{g}, \qquad L = v_0\cos\alpha\; T.$$

## Air resistance

At the speeds of thrown balls the drag force grows with the square of the speed and points against the velocity:

$$\vec F_d = -\frac{1}{2}\rho\, C\, S\, v\,\vec v,$$

where $\rho = 1.204\ \text{kg/m}^3$ is the air density, $C = 0.47$ the drag coefficient of a sphere and $S = \pi d^2/4$ the cross-section of the ball. Newton's second law

$$m\frac{d\vec v}{dt} = m\vec g + \vec F_d$$

has no formula solution, so the simulation integrates it numerically (Runge–Kutta method, step 1 ms).

With drag the trajectory is no longer symmetric: the descent is steeper than the climb, the range is shorter, and the best angle is below 45°. Light balls with a large cross-section (a ping-pong ball) are affected most, a shot put hardly at all.

## How the lab works

Without drag, $L = \dfrac{v_0^2}{g}\sin 2\alpha$ is proportional to $\sin 2\alpha$. Plot $L$ against $\sin 2\alpha$, fit a line $L = k\sin 2\alpha + b$, and find

$$v_0 = \sqrt{k g}.$$

If the points do not lie on a straight line through the origin, the formula does not describe the experiment (air resistance, a raised launch point).

## Assumptions of the model

- The ball is a point; its spin (Magnus effect) and wind are ignored.
- The drag coefficient is constant; real balls change $C$ with speed.
- $g = 9.81\ \text{m/s}^2$ and the ground is flat.
