<?php

namespace App\Services;

class PaymentService
{
    protected $merchantKey;
    protected $merchantSalt;
    protected $payuUrl;

    public function __construct()
    {
        $this->merchantKey = config('services.payu.key');
        $this->merchantSalt = config('services.payu.salt');
        $this->payuUrl = config('services.payu.test_mode') 
            ? 'https://test.payu.in/_payment' 
            : 'https://secure.payu.in/_payment';
    }

    public function generateHash($params)
    {
        // key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
        $hashString = $this->merchantKey . '|' . 
                      $params['txnid'] . '|' . 
                      $params['amount'] . '|' . 
                      $params['productinfo'] . '|' . 
                      $params['firstname'] . '|' . 
                      $params['email'] . '||||||||||' . 
                      $this->merchantSalt;

        return strtolower(hash('sha512', $hashString));
    }

    public function getPaymentUrl()
    {
        return $this->payuUrl;
    }

    public function getMerchantKey()
    {
        return $this->merchantKey;
    }
}
