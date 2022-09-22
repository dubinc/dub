import { Github, Logo, Twitter } from "../shared/icons";

const Footer = () => {
  return (
    <div className="border-t border-gray-200 h-20 flex items-center justify-center space-x-3">
      <Github className="w-4 h-4 text-gray-600" />
      <Logo className="w-6 h-6 text-gray-600" />
      <Twitter className="w-4 h-4 text-gray-600" />
    </div>
  );
};

export default Footer;
