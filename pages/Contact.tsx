import React from 'react';

const Contact: React.FC = () => {
  return (
    <div className="container mx-auto px-8 py-16 animate-in fade-in">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-5xl serif mb-6">Iletisim</h1>
        <p className="text-gray-500 text-sm tracking-[0.2em] uppercase mb-10">Bize Ulasin</p>
        <div className="space-y-4 text-gray-600 text-base leading-relaxed">
          <p>E-posta: hello@isis.com</p>
          <p>Telefon: +90 212 000 00 00</p>
          <p>Adres: Nisantasi, Istanbul</p>
        </div>
      </div>
    </div>
  );
};

export default Contact;
