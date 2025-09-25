import { Request, Response, NextFunction } from "express";
import { isDisposableEmail } from "../utils/disposableEmail";
import { hasValidMx } from "../utils/mxCheck";

export async function validateEmailDomain(req: Request, res: Response, next: NextFunction) {
  try {
    const email = (req.body?.email || "") as string;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ message: "Valid email is required" });
    }

    // Block disposable emails
    if (await isDisposableEmail(email)) {
      return res.status(400).json({ message: "Disposable/temporary email addresses are not allowed" });
    }

    // MX check
    const domain = email.split("@")[1];
    if (!domain || !(await hasValidMx(domain))) {
      return res.status(400).json({ message: "Email domain is not valid (no MX records found)" });
    }

    return next();
  } catch (e) {
    return res.status(500).json({ message: "Email validation error" });
  }
}
