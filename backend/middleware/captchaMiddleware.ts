import axios from "axios";
import { Request, Response, NextFunction } from "express";

// Supports Google reCAPTCHA v2/v3 or hCaptcha based on available secrets
export async function verifyCaptcha(req: Request, res: Response, next: NextFunction) {
  try {
    const token = (req.body.captchaToken || req.body.captcha || req.headers["x-captcha-token"]) as string | undefined;
    const hcaptchaSecret = process.env.HCAPTCHA_SECRET;
    const recaptchaSecret = process.env.RECAPTCHA_SECRET;

    // If not configured, skip verification (allow in dev / until configured)
    if (!hcaptchaSecret && !recaptchaSecret) {
      return next();
    }

    if (!token) return res.status(400).json({ message: "Missing captcha token" });

    if (hcaptchaSecret) {
      const resp = await axios.post("https://hcaptcha.com/siteverify", null, {
        params: { secret: hcaptchaSecret, response: token },
      });
      if (!resp.data?.success) return res.status(400).json({ message: "Captcha verification failed" });
      return next();
    }

    if (recaptchaSecret) {
      const resp = await axios.post("https://www.google.com/recaptcha/api/siteverify", null, {
        params: { secret: recaptchaSecret, response: token },
      });
      if (!resp.data?.success) return res.status(400).json({ message: "Captcha verification failed" });
      return next();
    }

    return next();
  } catch (e) {
    return res.status(500).json({ message: "Captcha verification error" });
  }
}
